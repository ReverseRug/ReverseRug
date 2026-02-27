import express, { Request, Response } from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { PublicKey } from '@solana/web3.js';
import { randomBytes, createPublicKey, verify as cryptoVerify } from 'crypto';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { getGlobalState, connection, programId, parseParticipant, getParticipantsByEpoch } from '../lib/rpc.js';
import { config } from '../config/index.js';
import fs from 'fs';

const execAsync = promisify(exec);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const ADMIN_ALLOWED_WALLETS = (process.env.ADMIN_ALLOWED_WALLET || '')
  .split(',')
  .map((wallet) => wallet.trim())
  .filter(Boolean);
const PARTICIPANT_LOG_START_EPOCH = Math.max(1, Number(process.env.PARTICIPANT_LOG_START_EPOCH || '1'));
const ADMIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const ADMIN_SESSION_TTL_MS = 60 * 60 * 1000;

const adminChallenges = new Map<string, { message: string; expiresAt: number }>();
const adminSessions = new Map<string, { wallet: string; expiresAt: number }>();

// Rate limiting
const rateLimit = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  requests: new Map<string, { count: number; resetTime: number }>(),
};

const checkRateLimit = (req: Request, res: Response, next: Function) => {
  if (req.method === 'GET') {
    return next();
  }
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const userLimit = rateLimit.requests.get(ip);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimit.requests.set(ip, { count: 1, resetTime: now + rateLimit.windowMs });
    return next();
  }
  
  if (userLimit.count >= rateLimit.max) {
    return res.status(429).json({ error: 'Too many requests, please try again later' });
  }
  
  userLimit.count++;
  next();
};

// Middleware
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
];

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (corsOrigins.length > 0 ? corsOrigins : defaultOrigins)
    : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(checkRateLimit);

// Root path handler
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'ReverseRug API Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      deposit: 'POST /api/deposit',
      claim: 'POST /api/claim',
      partialWithdraw: 'POST /api/partial-withdraw'
    },
    status: 'ready'
  });
});

// Helper to run npm scripts
async function runNpmScript(scriptName: string, env: Record<string, string> = {}): Promise<{ stdout: string; stderr: string }> {
  const command = `npm run ${scriptName}`;
  const cwd = path.dirname(new URL(import.meta.url).pathname).replace(/\/server$/, '');
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: { ...process.env, ...env },
      timeout: 30000, // 30 second timeout
    });
    
    return { stdout, stderr };
  } catch (error: any) {
    throw new Error(`Script failed: ${error.message}`);
  }
}

const toU64Le = (value: bigint): Buffer => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
};

const resolveProofFile = (epoch: number): string => {
  const filename = `distribution-epoch-${epoch}.json`;
  const candidates = [
    config.proofBucketPath ? path.join(config.proofBucketPath, filename) : '',
    path.join(process.cwd(), 'proofs', filename),
    path.join('/app/proofs', filename),
  ].filter(Boolean);

  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  return candidates[0] ?? filename;
};

const getAdminTokenFromRequest = (req: Request): string => {
  const header = req.header('x-admin-token');
  if (header) return header.trim();
  const bodyToken = typeof req.body?.token === 'string' ? req.body.token : '';
  return bodyToken.trim();
};

const requireAdminSession = (req: Request, res: Response): { wallet: string } | null => {
  const token = getAdminTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Admin token is required' });
    return null;
  }

  const session = adminSessions.get(token);
  const now = Date.now();
  if (!session || session.expiresAt < now) {
    if (session && session.expiresAt < now) adminSessions.delete(token);
    res.status(401).json({ success: false, error: 'Invalid or expired admin session' });
    return null;
  }

  if (!ADMIN_ALLOWED_WALLETS.includes(session.wallet)) {
    res.status(403).json({ success: false, error: 'Unauthorized admin wallet' });
    return null;
  }

  return { wallet: session.wallet };
};

const getTokenBalanceSafe = async (account: PublicKey): Promise<string> => {
  try {
    const balance = await connection.getTokenAccountBalance(account);
    return balance.value.uiAmountString || '0';
  } catch {
    return '0';
  }
};

const verifySolanaMessageSignature = (
  wallet: PublicKey,
  message: string,
  signature: Buffer
): boolean => {
  // RFC8410 SPKI prefix for raw Ed25519 public key
  const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
  const publicKeyDer = Buffer.concat([spkiPrefix, Buffer.from(wallet.toBytes())]);
  const keyObject = createPublicKey({ key: publicKeyDer, format: 'der', type: 'spki' });
  return cryptoVerify(null, Buffer.from(message, 'utf-8'), keyObject, signature);
};

// POST /api/deposit - Deposit tokens into the pool
app.post('/api/deposit', async (req: Request, res: Response) => {
  try {
    const { amount, participantIndex } = req.body;

    if (!amount || !participantIndex) {
      return res.status(400).json({ error: 'amount and participantIndex are required' });
    }

    // Enforce round window server-side to prevent late deposits via direct API calls.
    const globalState = await getGlobalState();
    const now = Math.floor(Date.now() / 1000);
    const epochEnd = Number(globalState.epochStart) + Number(globalState.epochDuration);
    if (now >= epochEnd) {
      return res.status(400).json({
        success: false,
        error: 'Round ended. Deposits are closed until next epoch starts.',
      });
    }

    const env = {
      AMOUNT: amount.toString(),
      PARTICIPANT_INDEX: participantIndex.toString(),
    };

    const result = await runNpmScript('deposit:participant:dist', env);
    
    res.json({
      success: true,
      message: 'Deposit initiated',
      output: result.stdout,
      amount,
      participantIndex,
    });
  } catch (error: any) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/claim - Claim rewards
app.post('/api/claim', async (req: Request, res: Response) => {
  try {
    const { participantIndex, epoch } = req.body;

    if (!participantIndex) {
      return res.status(400).json({ error: 'participantIndex is required' });
    }

    const env: Record<string, string> = {
      PARTICIPANT_INDEX: participantIndex.toString(),
    };

    if (epoch) {
      env.EPOCH = epoch.toString();
    }

    const result = await runNpmScript('claim:dist', env);

    res.json({
      success: true,
      message: 'Claim initiated',
      output: result.stdout,
      participantIndex,
    });
  } catch (error: any) {
    console.error('Claim error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/partial-withdraw - Partial withdrawal (50% refund)
app.post('/api/partial-withdraw', async (req: Request, res: Response) => {
  try {
    const { participantIndex, epoch } = req.body;

    if (!participantIndex) {
      return res.status(400).json({ error: 'participantIndex is required' });
    }

    const env: Record<string, string> = {
      PARTICIPANT_INDEX: participantIndex.toString(),
    };

    if (epoch) {
      env.EPOCH = epoch.toString();
    }

    const result = await runNpmScript('partial:withdraw:dist', env);

    res.json({
      success: true,
      message: 'Partial withdrawal initiated',
      output: result.stdout,
      participantIndex,
      refundPercentage: 50,
    });
  } catch (error: any) {
    console.error('Partial withdraw error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/health - Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// POST /api/admin/auth/challenge - create challenge message for wallet signature
app.post('/api/admin/auth/challenge', async (req: Request, res: Response) => {
  try {
    const wallet = (req.body?.wallet || '').toString().trim();
    if (!wallet) {
      return res.status(400).json({ success: false, error: 'wallet is required' });
    }

    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(wallet);
    } catch {
      return res.status(400).json({ success: false, error: 'invalid wallet' });
    }

    if (!ADMIN_ALLOWED_WALLETS.includes(pubkey.toBase58())) {
      return res.status(403).json({ success: false, error: 'wallet is not allowed for admin access' });
    }

    const nonce = randomBytes(16).toString('hex');
    const ts = new Date().toISOString();
    const message =
      `ReverseRug Admin Login\n` +
      `Wallet: ${pubkey.toBase58()}\n` +
      `Nonce: ${nonce}\n` +
      `Timestamp: ${ts}`;

    adminChallenges.set(pubkey.toBase58(), {
      message,
      expiresAt: Date.now() + ADMIN_CHALLENGE_TTL_MS,
    });

    return res.json({
      success: true,
      data: {
        message,
        expiresInMs: ADMIN_CHALLENGE_TTL_MS,
        adminWallets: ADMIN_ALLOWED_WALLETS,
      },
    });
  } catch (error: any) {
    console.error('Admin challenge error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/auth/verify - verify signed challenge and issue session token
app.post('/api/admin/auth/verify', async (req: Request, res: Response) => {
  try {
    const wallet = (req.body?.wallet || '').toString().trim();
    const message = (req.body?.message || '').toString();
    const signatureBase64 = (req.body?.signature || '').toString().trim();

    if (!wallet || !message || !signatureBase64) {
      return res.status(400).json({ success: false, error: 'wallet, message and signature are required' });
    }

    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(wallet);
    } catch {
      return res.status(400).json({ success: false, error: 'invalid wallet' });
    }

    if (!ADMIN_ALLOWED_WALLETS.includes(pubkey.toBase58())) {
      return res.status(403).json({ success: false, error: 'wallet is not allowed for admin access' });
    }

    const challenge = adminChallenges.get(pubkey.toBase58());
    if (!challenge || challenge.expiresAt < Date.now()) {
      return res.status(401).json({ success: false, error: 'challenge expired or missing' });
    }
    if (challenge.message !== message) {
      return res.status(401).json({ success: false, error: 'challenge mismatch' });
    }

    const signature = Buffer.from(signatureBase64, 'base64');
    const valid = verifySolanaMessageSignature(pubkey, message, signature);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'signature verification failed' });
    }

    adminChallenges.delete(pubkey.toBase58());
    const token = randomBytes(32).toString('hex');
    adminSessions.set(token, {
      wallet: pubkey.toBase58(),
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    });

    return res.json({
      success: true,
      data: {
        token,
        expiresInMs: ADMIN_SESSION_TTL_MS,
        wallet: pubkey.toBase58(),
      },
    });
  } catch (error: any) {
    console.error('Admin verify error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/overview - admin dashboard stats
app.get('/api/admin/overview', async (req: Request, res: Response) => {
  try {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const globalState = await getGlobalState();
    const now = Math.floor(Date.now() / 1000);
    const epochStart = Number(globalState.epochStart);
    const epochDuration = Number(globalState.epochDuration);
    const epochEnd = epochStart + epochDuration;
    const timeLeft = Math.max(0, epochEnd - now);

    const vaultBalance = await getTokenBalanceSafe(globalState.vault);

    const devTarget = config.devFeeAccount ? new PublicKey(config.devFeeAccount) : null;
    const buybackTarget = config.buybackFeeAccount ? new PublicKey(config.buybackFeeAccount) : null;
    const usdcMint = new PublicKey(config.usdcMint);

    const devTokenAccount = devTarget
      ? getAssociatedTokenAddressSync(usdcMint, devTarget, false)
      : null;
    const buybackTokenAccount = buybackTarget
      ? getAssociatedTokenAddressSync(usdcMint, buybackTarget, false)
      : null;

    const [devBalance, buybackBalance] = await Promise.all([
      devTokenAccount ? getTokenBalanceSafe(devTokenAccount) : Promise.resolve('0'),
      buybackTokenAccount ? getTokenBalanceSafe(buybackTokenAccount) : Promise.resolve('0'),
    ]);

    return res.json({
      success: true,
      data: {
        adminWallet: session.wallet,
        authority: globalState.authority.toBase58(),
        currentEpoch: Number(globalState.currentEpoch),
        epochStart,
        epochEnd,
        epochDuration,
        timeLeft,
        roundEnded: now >= epochEnd,
        vault: {
          tokenAccount: globalState.vault.toBase58(),
          uiAmount: vaultBalance,
        },
        feeWallets: {
          dev: {
            owner: config.devFeeAccount || '',
            tokenAccount: devTokenAccount?.toBase58() || '',
            uiAmount: devBalance,
          },
          buyback: {
            owner: config.buybackFeeAccount || '',
            tokenAccount: buybackTokenAccount?.toBase58() || '',
            uiAmount: buybackBalance,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/participants-log - round based participant list
app.get('/api/admin/participants-log', async (req: Request, res: Response) => {
  try {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const globalState = await getGlobalState();
    const currentEpoch = Number(globalState.currentEpoch);

    const toEpochQuery = Number(req.query.toEpoch ?? currentEpoch);
    const fromEpochQuery = Number(req.query.fromEpoch ?? 1);
    const limitQuery = Number(req.query.limit ?? 25);

    const toEpoch = Math.min(currentEpoch, Number.isFinite(toEpochQuery) ? Math.floor(toEpochQuery) : currentEpoch);
    const safeLimit = Math.min(100, Math.max(1, Number.isFinite(limitQuery) ? Math.floor(limitQuery) : 25));
    const fromEpochMin = Math.max(1, toEpoch - safeLimit + 1);
    const fromEpoch = Math.max(
      PARTICIPANT_LOG_START_EPOCH,
      fromEpochMin,
      Number.isFinite(fromEpochQuery) ? Math.floor(fromEpochQuery) : fromEpochMin
    );

    const rounds: Array<{
      epoch: number;
      participantCount: number;
      participants: Array<{
        wallet: string;
        depositedUsdc: number;
      }>;
    }> = [];

    for (let epoch = toEpoch; epoch >= fromEpoch; epoch -= 1) {
      const participantsRaw = await getParticipantsByEpoch(
        BigInt(epoch),
        epoch === currentEpoch ? { minDepositTime: globalState.epochStart } : undefined
      );
      const participants = participantsRaw
        .map((p) => ({
          wallet: p.owner,
          depositedUsdc: Number((p.depositedUsdc / 1e6).toFixed(6)),
        }))
        .sort((a, b) => b.depositedUsdc - a.depositedUsdc);

      rounds.push({
        epoch,
        participantCount: participants.length,
        participants,
      });
    }

    return res.json({
      success: true,
      data: {
        requestedBy: session.wallet,
        currentEpoch,
        fromEpoch,
        toEpoch,
        totalRounds: rounds.length,
        rounds,
      },
    });
  } catch (error: any) {
    console.error('Admin participants log error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/start-epoch - starts next epoch with custom duration
app.post('/api/admin/start-epoch', async (req: Request, res: Response) => {
  try {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const durationSeconds = Number(req.body?.durationSeconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 10) {
      return res.status(400).json({ success: false, error: 'durationSeconds must be >= 10' });
    }

    const result = await runNpmScript('start:epoch:dist', {
      EPOCH_DURATION: String(Math.floor(durationSeconds)),
    });

    return res.json({
      success: true,
      message: 'Epoch started',
      data: {
        durationSeconds: Math.floor(durationSeconds),
        requestedBy: session.wallet,
      },
      output: result.stdout,
    });
  } catch (error: any) {
    console.error('Admin start epoch error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/distribute - finalize current round and distribute rewards/fees
app.post('/api/admin/distribute', async (req: Request, res: Response) => {
  try {
    const session = requireAdminSession(req, res);
    if (!session) return;

    const result = await runNpmScript('weekly', { RUN_ONCE: 'true' });

    return res.json({
      success: true,
      message: 'Distribution run triggered',
      data: {
        requestedBy: session.wallet,
      },
      output: result.stdout,
    });
  } catch (error: any) {
    console.error('Admin distribute error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/claim-proof - Get merkle proof for claimant
app.get('/api/claim-proof', async (req: Request, res: Response) => {
  try {
    const address = (req.query.address || '').toString();
    if (!address) {
      return res.status(400).json({ error: 'address is required' });
    }

    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'invalid address' });
    }

    const epoch = req.query.epoch
      ? Number(req.query.epoch)
      : Number((await getGlobalState()).currentEpoch);

    const proofFile = resolveProofFile(epoch);

    if (!fs.existsSync(proofFile)) {
      return res.status(404).json({ error: `Proof file not found for epoch ${epoch}` });
    }

    const bundle = JSON.parse(fs.readFileSync(proofFile, 'utf-8')) as {
      epoch: number;
      totalPayout: string;
      root: string;
      leaves?: Array<{ address: string; amount: string; proof: string[] }>;
    };

    const entry = bundle.leaves?.find((leaf) => leaf.address === address);
    if (!entry) {
      return res.status(404).json({ error: `No proof entry for ${address}` });
    }

    res.json({
      success: true,
      data: {
        epoch: bundle.epoch,
        address: entry.address,
        amount: entry.amount,
        proof: entry.proof,
        root: bundle.root,
        totalPayout: bundle.totalPayout,
      },
    });
  } catch (error: any) {
    console.error('Claim proof error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/round-result - Winner/refund status for a wallet in an epoch
app.get('/api/round-result', async (req: Request, res: Response) => {
  try {
    const address = (req.query.address || '').toString();
    if (!address) {
      return res.status(400).json({ error: 'address is required' });
    }

    let wallet: PublicKey;
    try {
      wallet = new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'invalid address' });
    }

    const epoch = req.query.epoch
      ? Number(req.query.epoch)
      : Number((await getGlobalState()).currentEpoch);

    const proofFile = resolveProofFile(epoch);
    if (!fs.existsSync(proofFile)) {
      return res.json({
        success: true,
        data: {
          epoch,
          status: 'not-finalized',
          claimable: false,
          claimed: false,
        },
      });
    }

    const bundle = JSON.parse(fs.readFileSync(proofFile, 'utf-8')) as {
      leaves?: Array<{ address: string; amount: string; proof: string[] }>;
    };
    const entry = bundle.leaves?.find((leaf) => leaf.address === wallet.toBase58());
    if (!entry) {
      return res.json({
        success: true,
        data: {
          epoch,
          status: 'not-participant',
          claimable: false,
          claimed: false,
        },
      });
    }

    const amountRaw = BigInt(entry.amount);
    const amountUsdc = Number(amountRaw) / 1e6;
    const isWinner = amountUsdc > config.refundUsd;

    const [claimRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('claim_record'), toU64Le(BigInt(epoch)), wallet.toBuffer()],
      programId
    );
    const claimRecord = await connection.getAccountInfo(claimRecordPda);
    const claimed = Boolean(claimRecord);

    return res.json({
      success: true,
      data: {
        epoch,
        status: isWinner ? 'winner' : 'refund',
        amount: entry.amount,
        amountUsdc,
        isWinner,
        claimable: !claimed,
        claimed,
      },
    });
  } catch (error: any) {
    console.error('Round result error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/round/current - Get current round/epoch info
app.get('/api/round/current', async (req: Request, res: Response) => {
  try {
    const globalState = await getGlobalState();
    
    const epochStart = Number(globalState.epochStart);
    const epochDuration = Number(globalState.epochDuration);
    const epochEnd = epochStart + epochDuration;
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = Math.max(0, epochEnd - now);
    
    // Check vault lock state
    const lockedUntil = Number(globalState.lockedUntil);
    const isVaultLocked = globalState.isVaultLocked && now < lockedUntil;
    const vaultLockTimeLeft = Math.max(0, lockedUntil - now);
    
    res.json({
      success: true,
      data: {
        currentEpoch: Number(globalState.currentEpoch),
        epochStart: epochStart,
        epochEnd: epochEnd,
        epochDuration: epochDuration,
        timeLeft: timeLeft,
        timeLeftDays: (timeLeft / 86400).toFixed(2),
        minDepositUsd: Number(globalState.minDepositUsd) / 1e6,
        thresholdUsd: Number(globalState.thresholdUsd) / 1e6,
        totalPayout: Number(globalState.totalPayout),
        carryoverEpoch: globalState.carryoverEpoch.toString(),
        isCarryover: globalState.carryoverEpoch !== 18446744073709551615n && globalState.carryoverEpoch < globalState.currentEpoch,
        authority: globalState.authority.toBase58(),
        vault: globalState.vault.toBase58(),
        vaultLocked: isVaultLocked,
        vaultLockTimeLeft: vaultLockTimeLeft,
      }
    });
  } catch (error: any) {
    console.error('Get round error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/round/stats - Get round statistics
app.get('/api/round/stats', async (req: Request, res: Response) => {
  try {
    const globalState = await getGlobalState();
    
    // Count participants for current epoch
    const participants = await getParticipantsByEpoch(globalState.currentEpoch, {
      minDepositTime: globalState.epochStart,
    });
    const participantCount = participants.length;

    // Jackpot should represent current round deposits only, not full vault carryover.
    const roundJackpotRaw = participants.reduce(
      (sum, participant) => sum + BigInt(Math.trunc(participant.depositedUsdc || 0)),
      0n
    );
    const jackpot = Number(roundJackpotRaw) / 1e6;
    
    res.json({
      success: true,
      data: {
        participants: participantCount,
        maxParticipants: 20, // From your system design
        jackpot,
        minDeposit: Number(globalState.minDepositUsd) / 1e6,
        currentEpoch: Number(globalState.currentEpoch),
      }
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/participant/:wallet - Get participant info (includes carryover check)
app.get('/api/participant/:wallet', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    
    if (!wallet) {
      return res.status(400).json({ error: 'wallet address is required' });
    }
    
    const userPubkey = new PublicKey(wallet);
    const globalState = await getGlobalState();
    
    const toU64Le = (value: bigint): Buffer => {
      const buffer = Buffer.alloc(8);
      buffer.writeBigUInt64LE(value);
      return buffer;
    };
    
    // Check current epoch participation
    const [participantPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('participant'), userPubkey.toBuffer(), toU64Le(globalState.currentEpoch)],
      programId
    );
    
    const accountInfo = await connection.getAccountInfo(participantPda);
    
    // Check carryover epoch participation
    let carryoverParticipant = null;
    const U64_MAX = 18446744073709551615n;
    if (globalState.carryoverEpoch !== U64_MAX && globalState.carryoverEpoch < globalState.currentEpoch) {
      const [carryoverPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('participant'), userPubkey.toBuffer(), toU64Le(globalState.carryoverEpoch)],
        programId
      );
      
      const carryoverInfo = await connection.getAccountInfo(carryoverPda);
      if (carryoverInfo) {
        const participant = parseParticipant(Buffer.from(carryoverInfo.data));
        carryoverParticipant = {
          epoch: Number(globalState.carryoverEpoch),
          depositedUsdc: Number(participant.depositedUsdc) / 1e6,
          eligible: participant.eligible,
          lastDepositTime: Number(participant.lastDepositTime),
        };
      }
    }
    
    if (!accountInfo) {
      return res.json({
        success: true,
        data: {
          exists: false,
          wallet: wallet,
          currentEpoch: Number(globalState.currentEpoch),
          carryover: carryoverParticipant,
        }
      });
    }
    
    const participant = parseParticipant(Buffer.from(accountInfo.data));
    const isCurrentEpochDeposit =
      participant.lastDepositEpoch === globalState.currentEpoch &&
      participant.lastDepositTime >= globalState.epochStart;

    if (!isCurrentEpochDeposit) {
      return res.json({
        success: true,
        data: {
          exists: false,
          wallet: wallet,
          currentEpoch: Number(globalState.currentEpoch),
          carryover: carryoverParticipant,
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        exists: true,
        wallet: wallet,
        owner: participant.owner.toBase58(),
        depositedUsdc: Number(participant.depositedUsdc) / 1e6,
        eligible: participant.eligible,
        lastDepositEpoch: Number(participant.lastDepositEpoch),
        lastDepositTime: Number(participant.lastDepositTime),
        currentEpoch: Number(globalState.currentEpoch),
        carryover: carryoverParticipant,
      }
    });
  } catch (error: any) {
    console.error('Get participant error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/winners - Get recent winners
app.get('/api/winners', async (req: Request, res: Response) => {
  try {
    const winnersPath = path.join(process.cwd(), 'winners.json');
    let winners: Array<{
      epoch: number;
      winner: string;
      prize: number;
      participants: number;
      timestamp: number;
      txSignature?: string;
    }> = [];
    
    if (fs.existsSync(winnersPath)) {
      const winnersData = fs.readFileSync(winnersPath, 'utf-8');
      winners = JSON.parse(winnersData);
    }
    
    // Keep newest item per (epoch + winner), prioritize entries that have tx signature.
    const dedupedByEpochWinner = new Map<string, typeof winners[number]>();
    const sorted = [...winners].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    for (const item of sorted) {
      const key = `${item.epoch}-${item.winner}`;
      if (!dedupedByEpochWinner.has(key)) {
        dedupedByEpochWinner.set(key, item);
      }
    }

    const recentWinners = Array.from(dedupedByEpochWinner.values())
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, 10);
    
    res.json({
      success: true,
      data: recentWinners,
    });
  } catch (error: any) {
    console.error('Get winners error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dividend API Server running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible from outside at port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET  /                     - Server info`);
  console.log(`  GET  /api/health           - Health check`);
  console.log(`  POST /api/deposit          - Deposit tokens`);
  console.log(`  POST /api/claim            - Claim rewards`);
  console.log(`  POST /api/partial-withdraw - Withdraw 50% refund`);
});

export default app;
