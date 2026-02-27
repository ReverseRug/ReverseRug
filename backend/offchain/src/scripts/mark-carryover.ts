import "dotenv/config";
import fs from "node:fs";
import { Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { config } from "../config/index.js";
import { connection, getGlobalState, getGlobalStatePda, programId } from "../lib/rpc.js";

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
  const globalState = await getGlobalState();
  const globalStatePda = await getGlobalStatePda();

  const instructionData = Buffer.alloc(16);
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.MarkCarryover;
  offset += 1;
  instructionData.writeBigUInt64LE(globalState.currentEpoch, offset);
  offset += 8;

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
    ],
    data: instructionData.slice(0, offset),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`MarkCarryover tx: ${sig}`);
  await confirmSignature(sig, "MarkCarryover");
};

main().catch((err) => {
  console.error("MarkCarryover failed:", err);
  process.exit(1);
});
