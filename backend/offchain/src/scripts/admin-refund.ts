import "dotenv/config";
import fs from "node:fs";
import { PublicKey, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env ${key}`);
  return value;
};

const toU64Le = (value: bigint): Buffer => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
};

const main = async () => {
  const signer = loadSigner();
  const globalState = await getGlobalState();
  const globalStatePda = await getGlobalStatePda();

  const owner = new PublicKey(getEnv("REFUND_OWNER"));
  const recipientToken = new PublicKey(getEnv("REFUND_RECIPIENT_TOKEN"));
  const amount = BigInt(getEnv("REFUND_AMOUNT"));

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), owner.toBuffer(), toU64Le(globalState.currentEpoch)],
    programId
  );

  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("participant_registry"), owner.toBuffer()],
    programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    programId
  );

  const instructionData = Buffer.alloc(32);
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.AdminRefund;
  offset += 1;
  instructionData.writeBigUInt64LE(globalState.currentEpoch, offset);
  offset += 8;
  instructionData.writeBigUInt64LE(amount, offset);
  offset += 8;

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
      { pubkey: participantPda, isSigner: false, isWritable: true },
      { pubkey: registryPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: recipientToken, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData.slice(0, offset),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`AdminRefund tx: ${sig}`);
  await confirmSignature(sig, "AdminRefund");
};

main().catch((err) => {
  console.error("AdminRefund failed:", err);
  process.exit(1);
});
