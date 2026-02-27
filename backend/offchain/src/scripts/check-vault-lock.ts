import "dotenv/config";
import fs from "node:fs";
import { PublicKey, Keypair } from "@solana/web3.js";
import { config } from "../config/index.js";
import { connection, programId } from "../lib/rpc.js";
import * as borsh from "borsh";

// GlobalState schema
const GlobalStateSchema = {
  struct: {
    authority: { array: { type: "u8", len: 32 } },
    usdc_mint: { array: { type: "u8", len: 32 } },
    vault: { array: { type: "u8", len: 32 } },
    min_deposit_usd: "u64",
    threshold_usd: "u64",
    current_epoch: "u64",
    epoch_start: "i64",
    epoch_duration: "i64",
    merkle_root: { array: { type: "u8", len: 32 } },
    total_payout: "u64",
    fee_taken_epoch: "u64",
    carryover_epoch: "u64",
    is_vault_locked: "u8", // bool = 1 byte
    locked_until: "i64",
    bump: "u8",
  },
};

const loadSigner = (): Keypair => {
  if (!fs.existsSync(config.cronKeypair)) {
    throw new Error(`Cron keypair not found: ${config.cronKeypair}`);
  }
  const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
  const keypairArray = JSON.parse(keypairData) as number[];
  return Keypair.fromSecretKey(new Uint8Array(keypairArray));
};

const getGlobalState = async () => {
  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );

  const account = await connection.getAccountInfo(globalStatePda);
  if (!account) {
    console.log("⚠️  GlobalState account not initialized yet");
    return null;
  }

  try {
    // Parse GlobalState manually
    const data = account.data;
    
    // Expected size: 32+32+32+8+8+8+8+8+32+8+8+8+1+8+1 = 254 bytes
    if (data.length < 193) {
      console.log(`⚠️  GlobalState account too small: ${data.length} bytes (expected 254)`);
      console.log("   This means GlobalState is not yet initialized with vault lock fields.");
      return null;
    }

    let offset = 0;

    // authority (32 bytes)
    const authority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // usdc_mint (32 bytes)
    const usdc_mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // vault (32 bytes)
    const vault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // min_deposit_usd (8 bytes = u64)
    const min_deposit_usd = data.readBigUInt64LE(offset);
    offset += 8;

    // threshold_usd (8 bytes = u64)
    const threshold_usd = data.readBigUInt64LE(offset);
    offset += 8;

    // current_epoch (8 bytes = u64)
    const current_epoch = data.readBigUInt64LE(offset);
    offset += 8;

    // epoch_start (8 bytes = i64)
    const epoch_start = data.readBigInt64LE(offset);
    offset += 8;

    // epoch_duration (8 bytes = i64)
    const epoch_duration = data.readBigInt64LE(offset);
    offset += 8;

    // merkle_root (32 bytes)
    offset += 32;

    // total_payout (8 bytes = u64)
    offset += 8;

    // fee_taken_epoch (8 bytes = u64)
    offset += 8;

    // carryover_epoch (8 bytes = u64)
    offset += 8;

    // is_vault_locked (1 byte = u8/bool)
    const is_vault_locked = data.length > offset && data[offset] !== 0;
    offset += 1;

    // locked_until (8 bytes = i64)
    let locked_until = 0n;
    if (data.length > offset + 8) {
      locked_until = data.readBigInt64LE(offset);
      offset += 8;
    }

    // bump (1 byte = u8)
    const bump = data.length > offset ? data[offset] : 0;

    return {
      authority: authority.toBase58(),
      vault: vault.toBase58(),
      min_deposit_usd: Number(min_deposit_usd),
      current_epoch: Number(current_epoch),
      is_vault_locked,
      locked_until: Number(locked_until),
      bump,
      dataLength: data.length,
    };
  } catch (e) {
    console.log("❌ Error parsing GlobalState:", (e as Error).message);
    return null;
  }
};

const main = async () => {
  const state = await getGlobalState();
  
  if (!state) {
    console.log("\n⚠️  GlobalState not initialized or not available");
    console.log("   → Run 'npm run init' first to initialize GlobalState");
    console.log("   → Or deploy program with correct PDA size\n");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const isCurrentlyLocked = state.is_vault_locked && now < state.locked_until;
  const timeUntilUnlock = state.locked_until - now;

  console.log("\n📊 VAULT LOCK STATUS:");
  console.log("─".repeat(50));
  console.log(`Authority: ${state.authority.substring(0, 8)}...`);
  console.log(`Vault: ${state.vault.substring(0, 8)}...`);
  console.log(`Current Epoch: ${state.current_epoch}`);
  console.log(`Min Deposit: $${(state.min_deposit_usd / 1e6).toFixed(2)} USDC`);
  console.log("─".repeat(50));
  console.log(`🔒 Vault Locked: ${state.is_vault_locked ? "YES" : "NO"}`);
  
  if (state.is_vault_locked) {
    const lockDate = new Date(state.locked_until * 1000);
    console.log(`⏰ Lock Until: ${lockDate.toISOString()}`);
    console.log(`   (${timeUntilUnlock} seconds remaining)`);
    
    if (isCurrentlyLocked) {
      console.log(`\n🚫 VAULT IS CURRENTLY LOCKED`);
      console.log(`   ⏳ Unlocks in ${timeUntilUnlock} seconds`);
      console.log(`   ❌ All deposits, claims, withdrawals will fail`);
    } else {
      console.log(`\n✅ VAULT IS UNLOCKED`);
      console.log(`   🔓 Lock time has passed`);
      console.log(`   ✅ Deposits, claims, withdrawals are allowed`);
    }
  } else {
    console.log(`✅ VAULT IS NOT LOCKED`);
    console.log(`   🔓 No restrictions on vault operations`);
  }
  
  console.log("─".repeat(50) + "\n");
};

main().catch(console.error);
