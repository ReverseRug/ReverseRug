#!/usr/bin/env node

/**
 * Start New Epoch Script
 * Calls StartEpoch instruction to begin a new epoch with specified duration
 * Usage: tsx src/scripts/start-new-epoch.ts [duration_seconds]
 */

import fs from "fs";
import { 
  connection, 
  programId, 
  getGlobalStatePda,
} from "../lib/rpc.js";
import { 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { config } from "../config/index.js";

enum RewardPoolInstruction {
  Initialize = 0,
  Deposit = 1,
  FinalizeEpoch = 2,
  Claim = 3,
  StartEpoch = 4,
  MarkCarryover = 5,
  AdminRefund = 6,
  DistributeFees = 7,
  PartialWithdraw = 8,
}

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
    console.log("🚀 Starting New Epoch...\n");

    // Load signer (cron keypair)
    if (!fs.existsSync(config.cronKeypair)) {
      throw new Error(`Cron keypair not found: ${config.cronKeypair}`);
    }

    const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
    const keypairArray = JSON.parse(keypairData) as number[];
    const signer = Keypair.fromSecretKey(new Uint8Array(keypairArray));

    console.log(`✍️  Authority: ${signer.publicKey.toString()}`);

    // Check balance
    const balance = await connection.getBalance(signer.publicKey);
    console.log(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      throw new Error("Insufficient balance (need at least 0.01 SOL)");
    }

    // Get GlobalState PDA
    const globalStatePda = await getGlobalStatePda();
    console.log(`📍 GlobalState PDA: ${globalStatePda.toString()}`);

    // Verify GlobalState exists
    const globalStateAccount = await connection.getAccountInfo(globalStatePda);
    if (!globalStateAccount) {
      throw new Error("GlobalState PDA does not exist. Run initialize first!");
    }

    console.log(`✓ GlobalState account found (size: ${globalStateAccount.data.length} bytes)`);

    // Parse current state
    const data = globalStateAccount.data;
    const currentEpoch = data.readBigUInt64LE(112); // offset 112
    const epochStart = data.readBigInt64LE(120); // offset 120
    const epochDuration = data.readBigInt64LE(128); // offset 128

    console.log(`\n📊 Current State:`);
    console.log(`  • Epoch: ${currentEpoch}`);
    console.log(`  • Epoch Start: ${epochStart} (${new Date(Number(epochStart) * 1000).toISOString()})`);
    console.log(`  • Epoch Duration: ${epochDuration} seconds (${Number(epochDuration) / 60} minutes)`);

    // Get epoch duration from args or env
    const durationArg = process.argv[2];
    const epochDurationSecs = durationArg 
      ? BigInt(durationArg)
      : (process.env.EPOCH_DURATION ? BigInt(process.env.EPOCH_DURATION) : 120n); // Default 2 minutes for testing

    console.log(`\n🔧 New Epoch Parameters:`);
    console.log(`  • Duration: ${epochDurationSecs} seconds (${Number(epochDurationSecs) / 60} minutes)`);
    console.log(`  • Next Epoch: ${Number(currentEpoch) + 1}`);

    // Build StartEpoch instruction
    const instructionData = Buffer.alloc(32);
    let offset = 0;

    // Discriminant (StartEpoch = 4)
    instructionData[offset] = RewardPoolInstruction.StartEpoch;
    offset += 1;

    // epoch_duration_secs (i64)
    instructionData.writeBigInt64LE(epochDurationSecs, offset);
    offset += 8;

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
    console.log(`\n🚀 Sending StartEpoch transaction...`);
    const tx = new Transaction().add(ix);
    const sig = await connection.sendTransaction(tx, [signer], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Transaction sent: ${sig}`);
    console.log(`🔗 View: https://explorer.solana.com/tx/${sig}?cluster=devnet`);

    // Wait for confirmation
    await confirmSignature(sig, "StartEpoch");

    // Verify new state
    const newGlobalStateAccount = await connection.getAccountInfo(globalStatePda);
    if (!newGlobalStateAccount) {
      throw new Error("Failed to verify GlobalState after StartEpoch!");
    }

    const newData = newGlobalStateAccount.data;
    const newEpoch = newData.readBigUInt64LE(112);
    const newEpochStart = newData.readBigInt64LE(120);
    const newEpochDuration = newData.readBigInt64LE(128);

    console.log(`\n✅ New State:`);
    console.log(`  • Epoch: ${newEpoch}`);
    console.log(`  • Epoch Start: ${newEpochStart} (${new Date(Number(newEpochStart) * 1000).toISOString()})`);
    console.log(`  • Epoch Duration: ${newEpochDuration} seconds (${Number(newEpochDuration) / 60} minutes)`);
    console.log(`  • Epoch End: ${new Date((Number(newEpochStart) + Number(newEpochDuration)) * 1000).toISOString()}`);

    console.log(`\n🎉 New epoch ${newEpoch} started successfully!`);

  } catch (error) {
    console.error("❌ Error starting new epoch:", error);
    process.exit(1);
  }
};

main();
