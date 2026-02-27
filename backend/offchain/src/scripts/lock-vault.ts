import "dotenv/config";
import fs from "node:fs";
import { PublicKey, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
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
  LockVault = 9,
  ReInitialize = 10,
}

const loadSigner = (): Keypair => {
  if (!fs.existsSync(config.cronKeypair)) {
    throw new Error(`Cron keypair not found: ${config.cronKeypair}`);
  }
  const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
  const keypairArray = JSON.parse(keypairData) as number[];
  return Keypair.fromSecretKey(new Uint8Array(keypairArray));
};

const buildLockVaultInstruction = async (duration_secs: bigint): Promise<TransactionInstruction> => {
  const signer = loadSigner();

  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );

  // Create instruction data with LockVault discriminator
  const instructionData = Buffer.alloc(9); // 1 byte discriminator + 8 for i64
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.LockVault;
  offset += 1;
  instructionData.writeBigInt64LE(duration_secs, offset); // i64 duration_secs
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
    ],
    data: instructionData,
  });
};

const main = async () => {
  // Parse duration from command line or use default
  let durationSecs = BigInt(604800); // Default: 1 week (604800 seconds)
  
  if (process.argv[2]) {
    durationSecs = BigInt(parseInt(process.argv[2]));
  }
  
  console.log(`Locking vault for ${durationSecs} seconds (${Number(durationSecs) / 3600} hours)`);
  
  const signer = loadSigner();
  const ix = await buildLockVaultInstruction(durationSecs);
  const tx = new Transaction().add(ix);

  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`LockVault tx: ${sig}`);
  
  const start = Date.now();
  let confirmed = false;
  while (!confirmed && Date.now() - start < 30000) {
    const status = await connection.getSignatureStatus(sig);
    if (status.value?.confirmationStatus === "confirmed") {
      confirmed = true;
      console.log("LockVault confirmed - vault is now locked!");
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

main().catch(console.error);
