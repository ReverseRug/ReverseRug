import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
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
  const keypairPath = process.env.USER_KEYPAIR
    || process.env.CLAIMANT_KEYPAIR
    || process.env.PARTICIPANT_KEYPAIR
    || config.cronKeypair;

  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Keypair not found: ${keypairPath}`);
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

const parseProof = (value: string): Uint8Array => {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  return new Uint8Array(Buffer.from(hex, "hex"));
};

const getProofFile = (epoch: number): string => {
  const base = config.proofBucketPath ?? ".";
  return path.join(base, `distribution-epoch-${epoch}.json`);
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
  const epoch = Number(globalState.currentEpoch);

  const proofFile = getProofFile(epoch);
  if (!fs.existsSync(proofFile)) {
    throw new Error(`Proof file not found: ${proofFile}`);
  }

  const proofJson = JSON.parse(fs.readFileSync(proofFile, "utf-8")) as {
    leaves?: Array<{ address: string; amount: string; proof: string[] }>;
  };

  const entry = proofJson.leaves?.find((leaf) => leaf.address === signer.publicKey.toBase58());
  if (!entry) {
    throw new Error(`No proof entry for claimant ${signer.publicKey.toBase58()}`);
  }

  const amount = BigInt(entry.amount);
  const proof = entry.proof.map(parseProof);

  const claimant = signer.publicKey;
  const usdcMint = new PublicKey(config.usdcMint);
  const claimantUsdc = getAssociatedTokenAddressSync(usdcMint, claimant);

  const globalStatePda = await getGlobalStatePda();
  const vaultPda = await getVaultPda();

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), claimant.toBuffer(), toU64Le(globalState.currentEpoch)],
    programId
  );

  const [claimRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("claim_record"), toU64Le(globalState.currentEpoch), claimant.toBuffer()],
    programId
  );

  const instructionData = Buffer.alloc(1 + 8 + 8 + 4 + proof.length * 32);
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.Claim;
  offset += 1;
  instructionData.writeBigUInt64LE(BigInt(epoch), offset);
  offset += 8;
  instructionData.writeBigUInt64LE(amount, offset);
  offset += 8;
  instructionData.writeUInt32LE(proof.length, offset);
  offset += 4;
  for (const node of proof) {
    instructionData.set(node, offset);
    offset += 32;
  }

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: claimant, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: false },
      { pubkey: claimRecordPda, isSigner: false, isWritable: true },
      { pubkey: participantPda, isSigner: false, isWritable: false },
      { pubkey: claimantUsdc, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: instructionData.slice(0, offset),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`Claim tx: ${sig}`);
  await confirmSignature(sig, "Claim");
};

main().catch((err) => {
  console.error("Claim failed:", err);
  process.exit(1);
});
