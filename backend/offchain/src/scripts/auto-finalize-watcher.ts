#!/usr/bin/env node

/**
 * Auto-Finalize Watcher
 * Monitors current epoch end time and automatically triggers finalization + new epoch start
 * 
 * Flow:
 * 1. Check current epoch end time
 * 2. When epoch ends, run weekly-distribution
 * 3. Wait 2 minutes (cooldown)
 * 4. Start new epoch with 2-minute duration
 * 5. Repeat
 * 
 * Usage: tsx src/scripts/auto-finalize-watcher.ts
 */

import { connection, getGlobalStatePda } from "../lib/rpc.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
const COOLDOWN_MS = 120000; // 2 minutes cooldown after finalize

interface EpochInfo {
  epoch: bigint;
  epochStart: bigint;
  epochDuration: bigint;
  epochEnd: bigint;
}

const getEpochInfo = async (): Promise<EpochInfo> => {
  const globalStatePda = await getGlobalStatePda();
  const globalStateAccount = await connection.getAccountInfo(globalStatePda);
  
  if (!globalStateAccount) {
    throw new Error("GlobalState PDA does not exist!");
  }

  const data = globalStateAccount.data;
  const epoch = data.readBigUInt64LE(112);
  const epochStart = data.readBigInt64LE(120);
  const epochDuration = data.readBigInt64LE(128);
  const epochEnd = epochStart + epochDuration;

  return { epoch, epochStart, epochDuration, epochEnd };
};

const runDistribution = async (): Promise<void> => {
  console.log(`\n🎲 Running weekly distribution...`);
  
  try {
    const { stdout, stderr } = await execAsync(
      'node --loader ts-node/esm src/jobs/weekly-distribution.ts',
      { maxBuffer: 50 * 1024 * 1024 } // 50MB combined stdout/stderr buffer for verbose logs
    );
    
    if (stderr) {
      console.log(`⚠️  Distribution stderr:\n${stderr}`);
    }
    
    console.log(`✅ Distribution output:\n${stdout}`);
  } catch (error: any) {
    console.error(`❌ Distribution failed:`, error.message);
    if (error.stdout) console.log(`Stdout: ${error.stdout}`);
    if (error.stderr) console.log(`Stderr: ${error.stderr}`);
    throw error;
  }
};

const startNewEpoch = async (durationSecs: number): Promise<void> => {
  console.log(`\n🚀 Starting new epoch (${durationSecs}s)...`);
  
  try {
    const { stdout, stderr } = await execAsync(
      `node --loader ts-node/esm src/scripts/start-new-epoch.ts ${durationSecs}`
    );
    
    if (stderr) {
      console.log(`⚠️  StartEpoch stderr:\n${stderr}`);
    }
    
    console.log(`✅ StartEpoch output:\n${stdout}`);
  } catch (error: any) {
    console.error(`❌ StartEpoch failed:`, error.message);
    if (error.stdout) console.log(`Stdout: ${error.stdout}`);
    if (error.stderr) console.log(`Stderr: ${error.stderr}`);
    throw error;
  }
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const formatTimestamp = (ts: bigint): string => {
  return new Date(Number(ts) * 1000).toISOString();
};

const main = async () => {
  console.log(`🤖 Auto-Finalize Watcher Started`);
  console.log(`⏱️  Check Interval: ${CHECK_INTERVAL_MS / 1000}s`);
  console.log(`❄️  Cooldown Period: ${COOLDOWN_MS / 1000}s\n`);

  let lastProcessedEpoch = 0n;

  while (true) {
    try {
      const info = await getEpochInfo();
      const now = BigInt(Math.floor(Date.now() / 1000));
      const timeUntilEnd = Number(info.epochEnd - now);

      // Status update
      if (timeUntilEnd > 0) {
        const minutes = Math.floor(timeUntilEnd / 60);
        const seconds = timeUntilEnd % 60;
        console.log(
          `📊 Epoch ${info.epoch} | ` +
          `Ends in: ${minutes}m ${seconds}s | ` +
          `End Time: ${formatTimestamp(info.epochEnd)}`
        );
      } else {
        console.log(
          `⏰ Epoch ${info.epoch} has ended! ` +
          `(${Math.abs(timeUntilEnd)}s ago)`
        );

        // Prevent duplicate processing
        if (info.epoch === lastProcessedEpoch) {
          console.log(`⏭️  Already processed epoch ${info.epoch}, waiting for new epoch...`);
          await sleep(CHECK_INTERVAL_MS);
          continue;
        }

        // Process finalization
        console.log(`\n🔄 ===== EPOCH ${info.epoch} FINALIZATION =====`);
        
        try {
          // Step 1: Run distribution
          await runDistribution();
          
          // Step 2: Cooldown
          console.log(`\n❄️  Cooldown period: ${COOLDOWN_MS / 1000}s...`);
          await sleep(COOLDOWN_MS);
          
          // Step 3: Start new epoch
          const newEpochDuration = Number(info.epochDuration); // Keep same duration
          await startNewEpoch(newEpochDuration);
          
          // Mark as processed
          lastProcessedEpoch = info.epoch;
          
          console.log(`\n✅ ===== EPOCH ${info.epoch} PROCESSED =====\n`);
          
        } catch (error) {
          console.error(`\n❌ Error processing epoch ${info.epoch}:`, error);
          console.log(`⏸️  Waiting ${CHECK_INTERVAL_MS / 1000}s before retry...\n`);
          await sleep(CHECK_INTERVAL_MS);
          continue;
        }
      }

      // Wait before next check
      await sleep(CHECK_INTERVAL_MS);

    } catch (error) {
      console.error(`❌ Watcher error:`, error);
      console.log(`⏸️  Waiting ${CHECK_INTERVAL_MS / 1000}s before retry...\n`);
      await sleep(CHECK_INTERVAL_MS);
    }
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Watcher stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Watcher terminated');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
