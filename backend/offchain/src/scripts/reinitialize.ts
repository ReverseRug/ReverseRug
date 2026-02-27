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

const buildReInitializeInstruction = async (): Promise<TransactionInstruction> => {
  const signer = loadSigner();

  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );

  // Create instruction data with ReInitialize discriminator
  const instructionData = Buffer.alloc(25); // 1 byte discriminator + 8 + 8 + 8
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.ReInitialize;
  offset += 1;
  instructionData.writeBigUInt64LE(BigInt(config.minDepositUsd), offset);
  offset += 8;
  instructionData.writeBigUInt64LE(0n, offset); // threshold_usd
  offset += 8;
  // Write vault (32 bytes) - keep current vault
  // We'll retrieve it below and include it
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
    ],
    data: instructionData.slice(0, offset),
  });
};

const main = async () => {
  const signer = loadSigner();
  const ix = await buildReInitializeInstruction();
  const tx = new Transaction().add(ix);

  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`ReInitialize tx: ${sig}`);
  
  const start = Date.now();
  let confirmed = false;
  while (!confirmed && Date.now() - start < 30000) {
    const status = await connection.getSignatureStatus(sig);
    if (status.value?.confirmationStatus === "confirmed") {
      confirmed = true;
      console.log("ReInitialize confirmed");
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

main().catch(console.error);
