import "dotenv/config";
import fs from "node:fs";
import { PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { config } from "../config/index.js";
import { connection, programId } from "../lib/rpc.js";

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

const buildInitializeInstruction = async (): Promise<TransactionInstruction> => {
  const signer = loadSigner();

  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );

  const [vaultPda] = await PublicKey.findProgramAddress(
    [Buffer.from("vault")],
    programId
  );

  const usdcMint = new PublicKey(config.usdcMint);

  // Get epoch duration from env or command line (default: 7 days)
  // Usage: EPOCH_DURATION=60 npm run init (for 60 seconds)
  const epochDurationSecs = process.env.EPOCH_DURATION 
    ? BigInt(process.env.EPOCH_DURATION)
    : BigInt(7 * 24 * 60 * 60); // Default 7 days

  console.log(`\nInitializing with epoch duration: ${epochDurationSecs} seconds (${Number(epochDurationSecs) / 86400} days)`);

  const instructionData = Buffer.alloc(33);
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.Initialize;
  offset += 1;
  instructionData.writeBigUInt64LE(BigInt(config.minDepositUsd), offset);
  offset += 8;
  instructionData.writeBigUInt64LE(0n, offset);
  offset += 8;
  instructionData.writeBigInt64LE(epochDurationSecs, offset);
  offset += 8;

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: instructionData.slice(0, offset),
  });
};

const main = async () => {
  const signer = loadSigner();
  
  // Check if GlobalState already exists
  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );
  
  const existingAccount = await connection.getAccountInfo(globalStatePda);
  if (existingAccount && existingAccount.data.length >= 247) {
    // Account exists with old structure, we need to close and recreate it
    // Since we can't directly close a program-owned account, we'll create a new epoch
    // This is a workaround - in production, you'd want a migration script
    console.log("GlobalState account already exists. Running full reinitialization...");
    console.log("Note: For production, you may need a migration/upgrade path.");
  }
  
  const ix = await buildInitializeInstruction();
  const tx = new Transaction().add(ix);

  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`Initialize tx: ${sig}`);
  const start = Date.now();
  const timeoutMs = 60_000;
  while (Date.now() - start < timeoutMs) {
    const status = await connection.getSignatureStatuses([sig]);
    const result = status.value[0];
    if (result?.err) {
      throw new Error(`Initialize failed: ${JSON.stringify(result.err)}`);
    }
    if (result?.confirmationStatus === "confirmed" || result?.confirmationStatus === "finalized") {
      console.log("Initialize confirmed");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Initialize not confirmed within ${timeoutMs}ms: ${sig}`);
};

main().catch((err) => {
  console.error("Initialize failed:", err);
  process.exit(1);
});
