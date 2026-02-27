import fs from "node:fs";
import path from "node:path";
import cron from "node-cron";
import { createHash } from "node:crypto";
import { buildMerkle } from "../lib/merkle.js";
import { config } from "../config/index.js";
import { DistributionShare } from "../types/index.js";
import {
  getGlobalState,
  getParticipantsByEpoch,
  connection,
  programId,
  getGlobalStatePda,
  getVaultPda,
  getLatestBlockhash,
} from "../lib/rpc.js";
import {
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { createStreamflowAirdrop } from "../lib/streamflow.js";

const USDC_DECIMALS = 6;
const BPS_DENOMINATOR = 10_000n;
const U64_MAX = 18446744073709551615n;
const usdcMint = new PublicKey(config.usdcMint);

const toUsdcBase = (usd: number): bigint => {
  const factor = 10 ** USDC_DECIMALS;
  return BigInt(Math.round(usd * factor));
};

const hashForWinner = (seed: string, owner: string): string => {
  return createHash("sha256").update(`${seed}:${owner}`).digest("hex");
};

const selectWinners = (
  participants: DistributionShare[],
  winnerCount: number,
  seed: string
): Set<string> => {
  if (winnerCount <= 0) return new Set();

  const ranked = participants
    .map((participant) => ({
      owner: participant.owner,
      sortKey: hashForWinner(seed, participant.owner),
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return new Set(ranked.slice(0, winnerCount).map((item) => item.owner));
};

const parseMockParticipants = (): DistributionShare[] | null => {
  const raw = process.env.MOCK_PARTICIPANTS;
  if (!raw) return null;

  if (raw === "demo") {
    return [
      {
        owner: "9xQeWvG816bUx9EPfYkBXh9f9gS3vRAxpeV7m5uJqQep",
        amount: 2_500_000n, // 2.5 USDC (6 decimals)
      },
      {
        owner: "H3C2yVbFT1u4oUuDrPqJ2x5r2Zp4qJ4a2xC6y1AqD1qv",
        amount: 2_500_000n,
      },
    ];
  }

  try {
    const parsed = JSON.parse(raw) as Array<{ owner: string; amount: string | number }>;
    return parsed.map((item) => ({
      owner: item.owner,
      amount: BigInt(item.amount),
    }));
  } catch (err) {
    console.error("❌ Invalid MOCK_PARTICIPANTS JSON:", err);
    return null;
  }
};

interface DistributionPlan {
  shares: DistributionShare[];
  meta: Record<string, unknown>;
  feeAmount: bigint;
  devFeeAmount: bigint;
  buybackFeeAmount: bigint;
}

const buildDistributionPlan = async (): Promise<DistributionPlan> => {
  try {
    console.log("📊 Fetching participants...");

    const globalState = await getGlobalState();
    const currentEpoch = globalState.currentEpoch;

    console.log(`📋 Current Epoch: ${currentEpoch}`);

    if (globalState.carryoverEpoch === currentEpoch) {
      return {
        shares: [],
        meta: { currentEpoch: Number(currentEpoch), reason: "carryover-marked" },
        feeAmount: 0n,
        devFeeAmount: 0n,
        buybackFeeAmount: 0n,
      };
    }

    const epochs: bigint[] = [currentEpoch];
    if (globalState.carryoverEpoch !== U64_MAX && globalState.carryoverEpoch < currentEpoch) {
      epochs.unshift(globalState.carryoverEpoch);
    }

    const participantsByEpoch = await Promise.all(
      epochs.map((epoch) => getParticipantsByEpoch(epoch))
    );

    const participantMap = new Map<string, (typeof participantsByEpoch)[number][number]>();
    for (const list of participantsByEpoch) {
      for (const participant of list) {
        if (!participantMap.has(participant.owner)) {
          participantMap.set(participant.owner, participant);
        }
      }
    }

    const participants = Array.from(participantMap.values());
    console.log(`👥 Found ${participants.length} eligible participants`);

    if (participants.length === 0) {
      return {
        shares: [],
        meta: { currentEpoch: Number(currentEpoch), reason: "no-participants" },
        feeAmount: 0n,
        devFeeAmount: 0n,
        buybackFeeAmount: 0n,
      };
    }

    const entryAmount = globalState.minDepositUsd;
    const participantsCount = participants.length;
    const totalPool = entryAmount * BigInt(participantsCount);
    const summedDeposits = participants.reduce(
      (sum, participant) => sum + BigInt(participant.depositedUsdc),
      0n
    );

    if (summedDeposits !== totalPool) {
      console.log(
        `⚠️  Deposit mismatch: expected ${totalPool} units, actual ${summedDeposits} units`
      );
    }

    const feeBps = BigInt(config.feeBps);
    const refundAmount = toUsdcBase(config.refundUsd);
    const minParticipants = config.minParticipants;

    const { blockhash, lastValidBlockHeight } = await getLatestBlockhash("finalized");
    const seedMaterial = `${currentEpoch.toString()}:${blockhash}:${lastValidBlockHeight}`;
    const seedHash = createHash("sha256").update(seedMaterial).digest("hex");
    const winnerSeed = `${currentEpoch.toString()}:${seedHash}`;
    const randomnessMeta: Record<string, unknown> = {
      randomnessSource: "blockhash",
      blockhash,
      lastValidBlockHeight,
      seedHash,
    };

    let shares: DistributionShare[] = [];
    let feeAmount = 0n;
    let devFeeAmount = 0n;
    let buybackFeeAmount = 0n;
    let refundPerLoser = 0n;
    let winnerShare = 0n;
    let winners: string[] = [];

    if (participantsCount < minParticipants) {
      return {
        shares: [],
        meta: {
          currentEpoch: Number(currentEpoch),
          participantsCount,
          minParticipants,
          reason: "carryover-pending",
        },
        feeAmount: 0n,
        devFeeAmount: 0n,
        buybackFeeAmount: 0n,
      };
    } else {
      feeAmount = (totalPool * feeBps) / BPS_DENOMINATOR;
      devFeeAmount = feeAmount / 2n;
      buybackFeeAmount = feeAmount - devFeeAmount;

      const poolAfterFee = totalPool > feeAmount ? totalPool - feeAmount : 0n;
      const winnersCount = Math.max(1, Math.floor(participantsCount / config.winnersPerParticipants));
      const losersCount = participantsCount - winnersCount;

      const winnerSet = selectWinners(
        participants.map((participant) => ({ owner: participant.owner, amount: 0n })),
        winnersCount,
        winnerSeed
      );

      winners = Array.from(winnerSet);
      refundPerLoser = refundAmount;
      let totalRefund = refundPerLoser * BigInt(losersCount);

      if (totalRefund > poolAfterFee) {
        refundPerLoser = losersCount > 0 ? poolAfterFee / BigInt(losersCount) : 0n;
        totalRefund = refundPerLoser * BigInt(losersCount);
      }

      const remaining = poolAfterFee > totalRefund ? poolAfterFee - totalRefund : 0n;
      winnerShare = winnersCount > 0 ? remaining / BigInt(winnersCount) : 0n;

      shares = participants.map((participant) => {
        const isWinner = winnerSet.has(participant.owner);
        return {
          owner: participant.owner,
          amount: isWinner ? winnerShare : refundPerLoser,
        };
      });
    }

    const meta = {
      currentEpoch: Number(currentEpoch),
      carryoverEpoch: globalState.carryoverEpoch.toString(),
      entryAmount: entryAmount.toString(),
      participantsCount,
      totalPool: totalPool.toString(),
      feeAmount: feeAmount.toString(),
      devFeeAmount: devFeeAmount.toString(),
      buybackFeeAmount: buybackFeeAmount.toString(),
      winnersCount: winners.length,
      winners,
      refundPerLoser: refundPerLoser.toString(),
      winnerShare: winnerShare.toString(),
      winnerSeed,
      minParticipants,
      ruleVersion: "v2-fixed-entry",
      ...randomnessMeta,
    };

    return {
      shares,
      meta,
      feeAmount,
      devFeeAmount,
      buybackFeeAmount,
    };
  } catch (err) {
    console.error("❌ Error fetching participants:", err);
    return {
      shares: [],
      meta: { reason: "error", error: String(err) },
      feeAmount: 0n,
      devFeeAmount: 0n,
      buybackFeeAmount: 0n,
    };
  }
};

// Instruction discriminant
enum RewardPoolInstruction {
  Initialize = 0,
  Deposit = 1,
  FinalizeEpoch = 2,
  Claim = 3,
  StartEpoch = 4,
  MarkCarryover = 5,
  AdminRefund = 6,
  DistributeFees = 7,
}

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

const resolveUsdcRecipientTokenAccount = async (
  input: string,
  signer: Keypair
): Promise<PublicKey> => {
  const candidate = new PublicKey(input);
  const candidateInfo = await connection.getAccountInfo(candidate);

  if (candidateInfo?.owner.equals(TOKEN_PROGRAM_ID)) {
    const tokenAccount = await getAccount(connection, candidate);
    if (!tokenAccount.mint.equals(usdcMint)) {
      throw new Error(`Configured fee account ${input} is a token account but not for USDC mint ${usdcMint.toString()}`);
    }
    return candidate;
  }

  const ata = getAssociatedTokenAddressSync(usdcMint, candidate, false);
  const ataInfo = await connection.getAccountInfo(ata);
  if (ataInfo) {
    return ata;
  }

  console.log(`🧩 Creating missing USDC ATA for ${candidate.toString()}: ${ata.toString()}`);
  const createAtaIx = createAssociatedTokenAccountInstruction(
    signer.publicKey,
    ata,
    candidate,
    usdcMint
  );
  const tx = new Transaction().add(createAtaIx);
  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await confirmSignature(sig, "Create fee ATA");
  return ata;
};

const pushRootOnChain = async (
  root: string,
  epoch: number,
  totalPayout: bigint
): Promise<string> => {
  try {
    console.log(`🔄 Pushing merkle root to blockchain for epoch ${epoch}...`);

    // Read keypair
    if (!fs.existsSync(config.cronKeypair)) {
      throw new Error(`Cron keypair not found: ${config.cronKeypair}`);
    }

    const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
    const keypairArray = JSON.parse(keypairData) as number[];
    const signer = Keypair.fromSecretKey(new Uint8Array(keypairArray));

    console.log(`✍️  Signer: ${signer.publicKey.toString()}`);

    // Get blockchain state
    const globalState = await getGlobalState();
    const globalStatePda = await getGlobalStatePda();

    // Parse root
    const merkleRootBuffer = Buffer.from(root.slice(2), "hex");
    const merkleRootArray = new Uint8Array(merkleRootBuffer);

    console.log(`📍 GlobalState PDA: ${globalStatePda.toString()}`);
    console.log(`🌳 Merkle Root: ${root}`);
    console.log(`💰 Total Payout: ${totalPayout} units`);

    // Build instruction data
    const instructionData = Buffer.alloc(1024);
    let offset = 0;

    // Discriminant (1 byte)
    instructionData[offset] = RewardPoolInstruction.FinalizeEpoch;
    offset += 1;

    // epoch (u64 - 8 bytes)
    instructionData.writeBigUInt64LE(BigInt(epoch), offset);
    offset += 8;

    // merkle_root ([u8; 32])
    merkleRootArray.forEach((byte, i) => {
      instructionData[offset + i] = byte;
    });
    offset += 32;

    // total_payout (u64 - 8 bytes)
    instructionData.writeBigUInt64LE(totalPayout, offset);
    offset += 8;

    // Create instruction
    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: signer.publicKey, isSigner: true, isWritable: false },
        { pubkey: globalStatePda, isSigner: false, isWritable: true },
      ],
      data: instructionData.slice(0, offset),
    });

    // Send transaction
    const tx = new Transaction().add(ix);
    const sig = await connection.sendTransaction(tx, [signer], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`✅ Transaction sent: ${sig}`);

    // Wait for confirmation
    await confirmSignature(sig, "FinalizeEpoch");
    return sig;
  } catch (err) {
    console.error("❌ Error pushing root on-chain:", err);
    throw err;
  }
};

const distributeFeesOnChain = async (
  epoch: number,
  devAmount: bigint,
  buybackAmount: bigint
): Promise<void> => {
  if (!config.devFeeAccount || !config.buybackFeeAccount) {
    console.log("⏭️  Fee accounts not configured, skipping fee distribution");
    return;
  }

  if (devAmount + buybackAmount === 0n) {
    console.log("⏭️  Fee amount is zero, skipping fee distribution");
    return;
  }

  console.log("💼 Distributing fees on-chain...");

  const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
  const keypairArray = JSON.parse(keypairData) as number[];
  const signer = Keypair.fromSecretKey(new Uint8Array(keypairArray));

  const globalStatePda = await getGlobalStatePda();
  const vaultPda = await getVaultPda();

  const devFeeAccount = await resolveUsdcRecipientTokenAccount(config.devFeeAccount, signer);
  const buybackFeeAccount = await resolveUsdcRecipientTokenAccount(config.buybackFeeAccount, signer);
  console.log(`💸 Dev fee token account: ${devFeeAccount.toString()}`);
  console.log(`💸 Buyback fee token account: ${buybackFeeAccount.toString()}`);

  const instructionData = Buffer.alloc(128);
  let offset = 0;

  instructionData[offset] = RewardPoolInstruction.DistributeFees;
  offset += 1;

  instructionData.writeBigUInt64LE(BigInt(epoch), offset);
  offset += 8;

  instructionData.writeBigUInt64LE(devAmount, offset);
  offset += 8;

  instructionData.writeBigUInt64LE(buybackAmount, offset);
  offset += 8;

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer.publicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: devFeeAccount, isSigner: false, isWritable: true },
      { pubkey: buybackFeeAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData.slice(0, offset),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [signer], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log(`✅ Fee distribution sent: ${sig}`);
  await confirmSignature(sig, "Fee distribution");
};

const markCarryoverOnChain = async (epoch: number): Promise<void> => {
  console.log(`↪️  Marking carryover for epoch ${epoch}...`);

  const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
  const keypairArray = JSON.parse(keypairData) as number[];
  const signer = Keypair.fromSecretKey(new Uint8Array(keypairArray));

  const globalStatePda = await getGlobalStatePda();

  const instructionData = Buffer.alloc(16);
  let offset = 0;
  instructionData[offset] = RewardPoolInstruction.MarkCarryover;
  offset += 1;
  instructionData.writeBigUInt64LE(BigInt(epoch), offset);
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

  console.log(`✅ MarkCarryover sent: ${sig}`);
  await confirmSignature(sig, "MarkCarryover");
};

const persistProofs = (bundle: unknown): void => {
  if (!config.proofBucketPath) {
    console.log("⏭️  Proof bucket path not configured, skipping persistence");
    return;
  }
  const file = path.join(
    config.proofBucketPath,
    `distribution-epoch-${(bundle as { epoch: number }).epoch}.json`
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const json = JSON.stringify(
    bundle,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
  fs.writeFileSync(file, json);
  console.log(`💾 Proofs persisted to ${file}`);
};

const persistWinners = (
  epoch: number,
  shares: DistributionShare[],
  winners: string[],
  txSignature?: string
): void => {
  const winnersPath = path.join(process.cwd(), "winners.json");
  const existing = fs.existsSync(winnersPath)
    ? (JSON.parse(fs.readFileSync(winnersPath, "utf-8")) as Array<Record<string, unknown>>)
    : [];

  const amountByOwner = new Map(shares.map((share) => [share.owner, share.amount]));
  const participants = shares.length;
  const timestamp = Math.floor(Date.now() / 1000);

  const entries = winners.map((winner) => ({
    epoch,
    winner,
    prize: Number(amountByOwner.get(winner) ?? 0n),
    participants,
    timestamp,
    txSignature,
  }));

  const seen = new Set(existing.map((item) => `${item.epoch}-${item.winner}`));
  const merged = [...existing, ...entries.filter((item) => !seen.has(`${item.epoch}-${item.winner}`))];

  fs.writeFileSync(winnersPath, JSON.stringify(merged, null, 2));
  console.log(`🏆 Winners persisted to ${winnersPath}`);
};

export const runWeeklyDistribution = async (): Promise<void> => {
  try {
    console.log("\n🔄 ===== WEEKLY DISTRIBUTION START =====");
    const startTime = Date.now();

    const mockShares = parseMockParticipants();
    const epoch = mockShares
      ? Number(process.env.MOCK_EPOCH ?? 0)
      : Number((await getGlobalState()).currentEpoch);

    const plan = mockShares
      ? {
          shares: mockShares,
          meta: { currentEpoch: epoch, mode: "mock" },
          feeAmount: 0n,
          devFeeAmount: 0n,
          buybackFeeAmount: 0n,
        }
      : await buildDistributionPlan();

    if (plan.shares.length === 0) {
      console.log("⚠️  Distribution skipped", plan.meta);

      if (!mockShares && plan.meta?.reason === "carryover-pending") {
        const globalState = await getGlobalState();
        const currentEpoch = Number(globalState.currentEpoch);
        if (globalState.carryoverEpoch !== globalState.currentEpoch) {
          await markCarryoverOnChain(currentEpoch);
        } else {
          console.log("↪️  Carryover already set for this epoch");
        }
      }

      return;
    }

    if (!mockShares) {
      const globalState = await getGlobalState();
      if (globalState.feeTakenEpoch !== BigInt(epoch)) {
        await distributeFeesOnChain(epoch, plan.devFeeAmount, plan.buybackFeeAmount);
      } else {
        console.log("⏭️  Fees already distributed for this epoch");
      }
    }

    const bundle = buildMerkle(epoch, plan.shares);
    console.log(`\n🌳 Merkle Tree Built:`);
    console.log(`   - Epoch: ${bundle.epoch}`);
    console.log(`   - Total Payout: ${bundle.totalPayout} units`);
    console.log(`   - Participants: ${bundle.leaves.length}`);
    console.log(`   - Root: ${bundle.root}`);

    let streamflowDistributorId: string | undefined;
    if (config.distributorType === "streamflow") {
      console.log("🚀 Streamflow distribution enabled");
      const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
      const keypairArray = JSON.parse(keypairData) as number[];
      const signer = Keypair.fromSecretKey(new Uint8Array(keypairArray));
      streamflowDistributorId = await createStreamflowAirdrop(plan.shares, epoch, signer);
      console.log(`✅ Streamflow distributor created: ${streamflowDistributorId}`);
    }

    const bundleWithMeta = {
      ...bundle,
      streamflowDistributorId,
      meta: plan.meta,
    };

    persistProofs(bundleWithMeta);

    if (process.env.DRY_RUN === "true") {
      console.log("🧪 DRY_RUN enabled: skipping on-chain push");
      const maxAmount = plan.shares.reduce((max, share) => (share.amount > max ? share.amount : max), 0n);
      const winnersFromMeta = Array.isArray((plan.meta as { winners?: string[] })?.winners)
        ? ((plan.meta as { winners?: string[] }).winners ?? [])
        : [];
      const winnersList = winnersFromMeta.length > 0
        ? winnersFromMeta
        : plan.shares.filter((share) => share.amount === maxAmount).map((share) => share.owner);
      persistWinners(bundle.epoch, plan.shares, winnersList);
    } else {
      const txSignature = await pushRootOnChain(bundle.root, bundle.epoch, bundle.totalPayout);
      const maxAmount = plan.shares.reduce((max, share) => (share.amount > max ? share.amount : max), 0n);
      const winnersFromMeta = Array.isArray((plan.meta as { winners?: string[] })?.winners)
        ? ((plan.meta as { winners?: string[] }).winners ?? [])
        : [];
      const winnersList = winnersFromMeta.length > 0
        ? winnersFromMeta
        : plan.shares.filter((share) => share.amount === maxAmount).map((share) => share.owner);
      persistWinners(bundle.epoch, plan.shares, winnersList, txSignature);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Distribution completed in ${elapsed}s!`);
    console.log("===== WEEKLY DISTRIBUTION END =====\n");
  } catch (err) {
    console.error("❌ Distribution failed:", err);
    throw err;
  }
};

// Run scheduler
if (process.env.RUN_ONCE === "true") {
  runWeeklyDistribution().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  // Schedule every Sunday 00:00 UTC+3 (Saturday 22:00 UTC)
  cron.schedule("0 22 * * 6", () => {
    runWeeklyDistribution().catch((err) => console.error(err));
  });
  console.log("📅 Cron job scheduled: Weekly distribution (Sundays 00:00 UTC+3)");
  console.log("   Running in background. Press Ctrl+C to stop.");
}
