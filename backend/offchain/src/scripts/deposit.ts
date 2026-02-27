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

const loadSigner = (): Keypair => {
  // Check if PARTICIPANT_KEYPAIR env var is set (for quick-add-participants.sh)
  const keypairPath = process.env.PARTICIPANT_KEYPAIR || config.cronKeypair;
  
  console.log(`🔑 Using keypair: ${keypairPath.slice(-30)}`);
  
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

const main = async () => {
  const signer = loadSigner();
  const globalState = await getGlobalState();
  const globalStatePda = await getGlobalStatePda();
  const vaultPda = await getVaultPda();

  const depositor = signer.publicKey;
  const usdcMint = new PublicKey(config.usdcMint);
  const depositorUsdc = getAssociatedTokenAddressSync(usdcMint, depositor);

  // Get amount from args or use min deposit
  const amountArg = process.argv[2];
  const depositAmountUsdc = amountArg ? parseFloat(amountArg) * 1e6 : Number(globalState.minDepositUsd);
  
  console.log(`\n💵 Depositing ${(depositAmountUsdc / 1e6).toFixed(2)} USDC from ${depositor.toString().slice(0, 8)}...`);
  console.log(`🔹 Epoch: ${globalState.currentEpoch}`);

  // Check wallet SOL balance
  console.log("🔹 Checking wallet SOL balance...");
  const walletInfo = await connection.getAccountInfo(depositor);
  const walletBalance = walletInfo?.lamports || 0;
  const requiredSol = 50000; // ~0.00005 SOL minimum
  
  console.log(`💰 Wallet SOL balance: ${(walletBalance / 1e9).toFixed(6)} SOL`);
  if (walletBalance < requiredSol) {
    throw new Error(
      `❌ Insufficient SOL balance. Current: ${(walletBalance / 1e9).toFixed(6)} SOL, ` +
      `Required: at least 0.00005 SOL`
    );
  }

  // Check USDC token account
  console.log("🔹 Checking USDC token account...");
  const depositorUsdcInfo = await connection.getAccountInfo(depositorUsdc);
  if (!depositorUsdcInfo) {
    throw new Error(
      `❌ USDC token account not found for wallet. ` +
      `Please create associated token account for USDC mint: ${usdcMint.toBase58()}`
    );
  }

  // Check USDC balance
  const minDepositAmount = globalState.minDepositUsd;
  console.log(`💡 Minimum deposit amount: ${(Number(minDepositAmount) / 1e6).toFixed(2)} USDC`);

  // Parse token account balance (SPL Token format, balance at offset 64, 8 bytes)
  const tokenData = depositorUsdcInfo.data;
  if (tokenData.length >= 72) {
    const balanceBytes = tokenData.slice(64, 72);
    const usdcBalance = BigInt(
      balanceBytes[0] +
      (balanceBytes[1] << 8) +
      (balanceBytes[2] << 16) +
      (balanceBytes[3] << 24) +
      (balanceBytes[4] << 32) +
      (balanceBytes[5] << 40) +
      (balanceBytes[6] << 48) +
      (balanceBytes[7] << 56)
    );
    console.log(`💰 USDC balance: ${(Number(usdcBalance) / 1e6).toFixed(2)} USDC`);
    
    if (usdcBalance < BigInt(depositAmountUsdc)) {
      throw new Error(
        `❌ Insufficient USDC balance. Current: ${(Number(usdcBalance) / 1e6).toFixed(2)} USDC, ` +
        `Required: ${(depositAmountUsdc / 1e6).toFixed(2)} USDC`
      );
    }
  }

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
  instructionData.writeBigUInt64LE(BigInt(depositAmountUsdc), offset);
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
  const sig = await connection.sendTransaction(tx, [signer], {
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

const logUnknown = (label: string, err: unknown) => {
  const safeErr = err instanceof Error ? err : new Error(String(err));
  console.error(label, safeErr);
  try {
    console.error("Details:", JSON.stringify(err));
  } catch {
    console.error("Details:", err);
  }
};

process.on("unhandledRejection", (err) => {
  logUnknown("Unhandled rejection:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logUnknown("Uncaught exception:", err);
  process.exit(1);
});

main().catch((err) => {
  logUnknown("Deposit failed:", err);
  process.exit(1);
});
