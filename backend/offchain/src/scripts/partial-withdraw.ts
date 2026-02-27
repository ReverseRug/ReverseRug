import "dotenv/config";
import fs from "node:fs";
import {
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { config } from "../config/index.js";
import {
  connection,
  getGlobalState,
  getGlobalStatePda,
  getVaultPda,
  programId,
} from "../lib/rpc.js";

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
  const keypairPath = process.env.PARTICIPANT_KEYPAIR || process.env.USER_KEYPAIR || config.cronKeypair;
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`User keypair not found: ${keypairPath}`);
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
  const user = loadSigner();
  const globalState = await getGlobalState();
  const epoch = Number(globalState.currentEpoch);

  console.log(`User: ${user.publicKey.toBase58()}`);
  console.log(`Current Epoch: ${epoch}`);
  console.log(`Carryover Epoch: ${globalState.carryoverEpoch}`);

  // CarryoverEpoch is set to current epoch or higher when in carryover
  if (Number(globalState.carryoverEpoch) === 0 || Number(globalState.carryoverEpoch) < epoch) {
    throw new Error(`Epoch ${epoch} is not in carryover state (carryover=${globalState.carryoverEpoch})`);
  }

  const usdcMint = new PublicKey(config.usdcMint);
  const userUsdc = getAssociatedTokenAddressSync(usdcMint, user.publicKey);

  const globalStatePda = await getGlobalStatePda();
  const vaultPda = await getVaultPda();

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), user.publicKey.toBuffer(), toU64Le(globalState.currentEpoch)],
    programId
  );

  const [participantRegistryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("participant_registry"), user.publicKey.toBuffer()],
    programId
  );

  const instructionData = Buffer.alloc(1 + 8);
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.PartialWithdraw;
  offset += 1;
  instructionData.writeBigUInt64LE(BigInt(epoch), offset);
  offset += 8;

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: user.publicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: false },
      { pubkey: participantPda, isSigner: false, isWritable: true },
      { pubkey: participantRegistryPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: userUsdc, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData.slice(0, offset),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [user], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`PartialWithdraw tx: ${sig}`);
  await confirmSignature(sig, "PartialWithdraw");
  console.log("✓ Partial withdraw completed");
  console.log("  → Refunded: 50% to user");
  console.log("  → Vault kept: 50% remains in pool");
  console.log("  → Status: User exited from pool");
};

main().catch((err) => {
  console.error("PartialWithdraw failed:", err);
  process.exit(1);
});
