#!/usr/bin/env node

/**
 * Production Reinitialization Script
 * Resets GlobalState for new epoch cycle (starting from epoch 1)
 * This script should be run once after deploying an updated program
 */

import fs from "fs";
import { 
  connection, 
  programId, 
  getGlobalStatePda,
  getVaultPda
} from "../lib/rpc.js";
import { 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction
} from "@solana/web3.js";
import { config } from "../config/index.js";

interface RewardPoolInstruction {
  ReInitialize: number;
}

const RewardPoolInstruction = {
  Initialize: 0,
  Deposit: 1,
  FinalizeEpoch: 2,
  Claim: 3,
  StartEpoch: 4,
  DistributeFees: 5,
  MarkCarryover: 6,
  AdminRefund: 7,
  PartialWithdraw: 8,
  LockVault: 9,
  ReInitialize: 10,
};

const confirmSignature = async (sig: string, label: string): Promise<void> => {
  const start = Date.now();
  const timeoutMs = 60_000;
  while (Date.now() - start < timeoutMs) {
    const status = await connection.getSignatureStatuses([sig]);
    const result = status.value[0];
    if (result?.err) {
      throw new Error(`${label} failed: ${JSON.stringify(result.err)}`);
    }
    if (result?.confirmationStatus === "confirmed" || result?.confirmationStatus === "finalized") {
      console.log(`✓ ${label} confirmed`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`${label} confirmation timeout after ${timeoutMs}ms`);
};

const main = async () => {
  try {
    console.log("🔄 Starting Production Reinitialization...\n");

    // Load signer (cron keypair)
    if (!fs.existsSync(config.cronKeypair)) {
      throw new Error(`Cron keypair not found: ${config.cronKeypair}`);
    }

    const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
    const keypairArray = JSON.parse(keypairData) as number[];
    const signer = Keypair.fromSecretKey(new Uint8Array(keypairArray));

    console.log(`✍️  Authority: ${signer.publicKey.toString()}`);

    // Get PDAs
    const globalStatePda = await getGlobalStatePda();
    const vaultPda = await getVaultPda();

    console.log(`📍 GlobalState PDA: ${globalStatePda.toString()}`);
    console.log(`🏦 Vault PDA: ${vaultPda.toString()}`);

    // Verify GlobalState exists
    const globalStateAccount = await connection.getAccountInfo(globalStatePda);
    if (!globalStateAccount) {
      throw new Error("GlobalState PDA does not exist. Run initialize first!");
    }

    console.log(`✓ GlobalState account found (size: ${globalStateAccount.data.length} bytes)`);

    // Parse current state
    const data = globalStateAccount.data;
    const currentEpoch = data.readBigUInt64LE(112); // offset 112
    const merkleRoot = data.slice(136, 168); // offset 136-167
    const totalPayout = data.readBigUInt64LE(168); // offset 168

    console.log(`\n📊 Current State:`);
    console.log(`  • Epoch: ${currentEpoch}`);
    console.log(`  • Merkle Root: ${merkleRoot.toString("hex")}`);
    console.log(`  • Total Payout: ${totalPayout}`);

    // Build ReInitialize instruction data
    const instructionData = Buffer.alloc(1024);
    let offset = 0;

    // Discriminant (ReInitialize = 7)
    instructionData[offset] = RewardPoolInstruction.ReInitialize;
    offset += 1;

    // min_deposit_usd (u64)
    instructionData.writeBigUInt64LE(BigInt(config.minDepositUsd), offset);
    offset += 8;

    // threshold_usd (u64) - Use min participants * min deposit
    const thresholdUsd = BigInt(config.minParticipants * config.minDepositUsd);
    instructionData.writeBigUInt64LE(thresholdUsd, offset);
    offset += 8;

    console.log(`\n🔧 Reinitialization Parameters:`);
    console.log(`  • Min Deposit: ${config.minDepositUsd} units`);
    console.log(`  • Threshold: ${thresholdUsd.toString()} units (${config.minParticipants} x ${config.minDepositUsd})`);

    // Create instruction
    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: false },
        { pubkey: globalStatePda, isSigner: false, isWritable: true },
      ],
      data: instructionData.slice(0, offset),
    });

    // Send transaction
    console.log(`\n🚀 Sending ReInitialize transaction...`);
    const tx = new Transaction().add(ix);
    const sig = await connection.sendTransaction(tx, [signer], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Transaction sent: ${sig}`);

    // Wait for confirmation
    await confirmSignature(sig, "ReInitialize");

    // Verify new state
    const newGlobalStateAccount = await connection.getAccountInfo(globalStatePda);
    if (!newGlobalStateAccount) {
      throw new Error("Failed to verify GlobalState after reinitialization!");
    }

    const newData = newGlobalStateAccount.data;
    const newEpoch = newData.readBigUInt64LE(112); // offset 112
    const newMerkleRoot = newData.slice(136, 168); // offset 136-167
    const newTotalPayout = newData.readBigUInt64LE(168); // offset 168

    console.log(`\n📊 New State After Reinitialization:`);
    console.log(`  • Epoch: ${newEpoch} (updated from ${currentEpoch})`);
    console.log(`  • Merkle Root: ${newMerkleRoot.toString("hex")} (cleared)`);
    console.log(`  • Total Payout: ${newTotalPayout} (reset to 0)`);

    console.log(`\n✨ Production Reinitialization Complete!`);
    console.log(`📝 Epoch is now reset to: 1`);
    console.log(`🎯 Ready for new distribution cycle\n`);

  } catch (err) {
    console.error("\n❌ Reinitialization failed:", err);
    process.exit(1);
  }
};

main();
