import "dotenv/config";
import fs from "node:fs";
import { Keypair, Transaction, TransactionInstruction, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { config } from "../config/index.js";
import { connection, getGlobalState, getGlobalStatePda, getVaultPda, programId } from "../lib/rpc.js";

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

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env ${key}`);
  return value;
};

const loadParticipant = (): Keypair => {
  const keypairPath = getEnv("PARTICIPANT_KEYPAIR");
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Participant keypair not found: ${keypairPath}`);
  }
  const keypairData = fs.readFileSync(keypairPath, "utf-8");
  const keypairArray = JSON.parse(keypairData) as number[];
  return Keypair.fromSecretKey(new Uint8Array(keypairArray));
};

const toU64Le = (value: bigint): Buffer => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
};

const main = async () => {
  const participant = loadParticipant();
  const globalState = await getGlobalState();
  const globalStatePda = await getGlobalStatePda();
  const vaultPda = await getVaultPda();

  const depositor = participant.publicKey;
  const usdcMint = new PublicKey(config.usdcMint);
  const depositorUsdc = getAssociatedTokenAddressSync(usdcMint, depositor);

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), depositor.toBuffer(), toU64Le(globalState.currentEpoch)],
    programId
  );

  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("participant_registry"), depositor.toBuffer()],
    programId
  );

  const instructionData = Buffer.alloc(16);
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.Deposit;
  offset += 1;
  instructionData.writeBigUInt64LE(globalState.minDepositUsd, offset);
  offset += 8;

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: participantPda, isSigner: false, isWritable: true },
      { pubkey: registryPda, isSigner: false, isWritable: true },
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
      { pubkey: depositor, isSigner: true, isWritable: false },
      { pubkey: depositorUsdc, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: instructionData.slice(0, offset),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [participant], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`Deposit tx: ${sig}`);
  const start = Date.now();
  const timeoutMs = 60_000;
  while (Date.now() - start < timeoutMs) {
    const status = await connection.getSignatureStatuses([sig]);
    const result = status.value[0];
    if (result?.err) {
      throw new Error(`Deposit failed: ${JSON.stringify(result.err)}`);
    }
    if (result?.confirmationStatus === "confirmed" || result?.confirmationStatus === "finalized") {
      console.log("Deposit confirmed");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Deposit not confirmed within ${timeoutMs}ms: ${sig}`);
};

main().catch((err) => {
  console.error("Deposit failed:", err);
  process.exit(1);
});
