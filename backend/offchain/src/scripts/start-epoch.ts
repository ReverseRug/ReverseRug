import "dotenv/config";
import fs from "node:fs";
import { Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { config } from "../config/index.js";
import { connection, getGlobalStatePda, programId } from "../lib/rpc.js";

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

const loadSigner = (): Keypair => {
  if (!fs.existsSync(config.cronKeypair)) {
    throw new Error(`Cron keypair not found: ${config.cronKeypair}`);
  }
  const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
  const keypairArray = JSON.parse(keypairData) as number[];
  return Keypair.fromSecretKey(new Uint8Array(keypairArray));
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
  throw new Error(`${label} not confirmed within ${timeoutMs}ms: ${sig}`);
};

const main = async () => {
  const signer = loadSigner();
  const globalStatePda = await getGlobalStatePda();

  // Get epoch duration from env or default to 120 seconds
  const epochDurationSecs = process.env.EPOCH_DURATION 
    ? BigInt(process.env.EPOCH_DURATION)
    : BigInt(120); // Default 2 minutes

  console.log(`\nStarting new epoch with duration: ${epochDurationSecs} seconds (${Number(epochDurationSecs) / 60} minutes)`);

  const instructionData = Buffer.alloc(9);
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.StartEpoch;
  offset += 1;
  instructionData.writeBigInt64LE(epochDurationSecs, offset);
  offset += 8;

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
    ],
    data: instructionData.slice(0, offset),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`StartEpoch tx: ${sig}`);
  await confirmSignature(sig, "StartEpoch");
};

main().catch((err) => {
  console.error("StartEpoch failed:", err);
  process.exit(1);
});
