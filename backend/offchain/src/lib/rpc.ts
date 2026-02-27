import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config/index.js";
import { ParticipantSnapshot } from "../types/index.js";

const connectionConfig = {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: false,
  httpHeaders: {
    "Content-Type": "application/json",
  },
} as const;

const getRpcFallbacksByNetwork = (): string[] => {
  const network = (process.env.SOLANA_NETWORK ?? "devnet").toLowerCase();
  if (network === "mainnet" || network === "mainnet-beta") {
    return ["https://api.mainnet-beta.solana.com"];
  }
  return ["https://api.devnet.solana.com"];
};

const parseRpcUrlsEnv = (): string[] => {
  const raw = process.env.RPC_URLS ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
};

const rpcUrls = Array.from(
  new Set([config.rpcUrl, ...parseRpcUrlsEnv(), ...getRpcFallbacksByNetwork()])
);

const rpcConnections = rpcUrls.map((url) => new Connection(url, connectionConfig));

export const connection = rpcConnections[0];

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
};

const isRetryableRpcError = (err: unknown): boolean => {
  const message = getErrorMessage(err).toLowerCase();
  if (message.includes("globalstate account not found") || message.includes("account not found")) {
    return false;
  }
  return (
    message.includes("fetch failed") ||
    message.includes("ecconnrefused") ||
    message.includes("enotfound") ||
    message.includes("timed out") ||
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("service unavailable") ||
    message.includes("gateway timeout")
  );
};

const withRpcFallback = async <T>(
  operation: string,
  call: (conn: Connection) => Promise<T>
): Promise<T> => {
  let lastError: unknown;

  for (let i = 0; i < rpcConnections.length; i++) {
    const conn = rpcConnections[i];
    try {
      if (i > 0) {
        console.warn(`⚠️  RPC fallback #${i + 1}/${rpcConnections.length}: ${rpcUrls[i]}`);
      }
      return await call(conn);
    } catch (err) {
      lastError = err;
      const message = getErrorMessage(err);
      console.warn(`⚠️  RPC error during ${operation} on ${rpcUrls[i]}: ${message}`);
      if (!isRetryableRpcError(err) || i === rpcConnections.length - 1) {
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`RPC operation failed: ${operation}`);
};

export const programId = new PublicKey(config.programId);
export const usdcMint = new PublicKey(config.usdcMint);

export const getLatestSlot = async (): Promise<number> =>
  withRpcFallback("getLatestSlot", (conn) => conn.getSlot());

export const getLatestBlockhash = async (
  commitment: "processed" | "confirmed" | "finalized" = "finalized"
) => withRpcFallback("getLatestBlockhash", (conn) => conn.getLatestBlockhash(commitment));

const GLOBAL_STATE_LEN_V1 = 193;
const GLOBAL_STATE_LEN_V2 = 202;

/**
 * Parse GlobalState account (v1: 193 bytes, v2: 202 bytes)
 */
export interface GlobalState {
  authority: PublicKey;
  usdcMint: PublicKey;
  vault: PublicKey;
  minDepositUsd: bigint;
  thresholdUsd: bigint;
  currentEpoch: bigint;
  epochStart: bigint;
  epochDuration: bigint;
  merkleRoot: Uint8Array;
  totalPayout: bigint;
  feeTakenEpoch: bigint;
  carryoverEpoch: bigint;
  isVaultLocked: boolean;
  lockedUntil: bigint;
  bump: number;
}

const ZERO_PUBKEY = new PublicKey(new Uint8Array(32));

const readPubkey = (data: Buffer, offset: number): [PublicKey, number] => {
  if (offset + 32 > data.length) {
    return [ZERO_PUBKEY, offset];
  }
  return [new PublicKey(data.slice(offset, offset + 32)), offset + 32];
};

const readU64 = (data: Buffer, offset: number): [bigint, number] => {
  if (offset + 8 > data.length) {
    return [0n, offset];
  }
  return [data.readBigUInt64LE(offset), offset + 8];
};

const readI64 = (data: Buffer, offset: number): [bigint, number] => {
  if (offset + 8 > data.length) {
    return [0n, offset];
  }
  return [data.readBigInt64LE(offset), offset + 8];
};

const readBytes32 = (data: Buffer, offset: number): [Uint8Array, number] => {
  if (offset + 32 > data.length) {
    return [new Uint8Array(32), offset];
  }
  return [new Uint8Array(data.slice(offset, offset + 32)), offset + 32];
};

const readU8 = (data: Buffer, offset: number): [number, number] => {
  if (offset + 1 > data.length) {
    return [0, offset];
  }
  return [data[offset], offset + 1];
};

export const parseGlobalState = (data: Buffer): GlobalState => {
  let offset = 0;

  let authority: PublicKey;
  [authority, offset] = readPubkey(data, offset);

  let usdcMint: PublicKey;
  [usdcMint, offset] = readPubkey(data, offset);

  let vault: PublicKey;
  [vault, offset] = readPubkey(data, offset);

  let minDepositUsd: bigint;
  [minDepositUsd, offset] = readU64(data, offset);

  let thresholdUsd: bigint;
  [thresholdUsd, offset] = readU64(data, offset);

  let currentEpoch: bigint;
  [currentEpoch, offset] = readU64(data, offset);

  let epochStart: bigint;
  [epochStart, offset] = readI64(data, offset);

  let epochDuration: bigint;
  [epochDuration, offset] = readI64(data, offset);

  let merkleRoot: Uint8Array;
  [merkleRoot, offset] = readBytes32(data, offset);

  let totalPayout: bigint;
  [totalPayout, offset] = readU64(data, offset);

  let feeTakenEpoch: bigint;
  [feeTakenEpoch, offset] = readU64(data, offset);

  let carryoverEpoch: bigint;
  [carryoverEpoch, offset] = readU64(data, offset);

  let isVaultLocked = false;
  let lockedUntil = 0n;
  let bump: number;

  if (data.length >= GLOBAL_STATE_LEN_V2) {
    let isLocked: number;
    [isLocked, offset] = readU8(data, offset);
    isVaultLocked = isLocked !== 0;

    [lockedUntil, offset] = readI64(data, offset);
    [bump] = readU8(data, offset);
  } else {
    [bump] = readU8(data, offset);
  }

  return {
    authority,
    usdcMint,
    vault,
    minDepositUsd,
    thresholdUsd,
    currentEpoch,
    epochStart,
    epochDuration,
    merkleRoot,
    totalPayout,
    feeTakenEpoch,
    carryoverEpoch,
    isVaultLocked,
    lockedUntil,
    bump,
  };
};

/**
 * Parse Participant account (58 bytes)
 */
export interface Participant {
  owner: PublicKey;
  depositedUsdc: bigint;
  eligible: boolean;
  lastDepositEpoch: bigint;
  lastDepositTime: bigint;
  bump: number;
}

export const parseParticipant = (data: Buffer): Participant => {
  let offset = 0;

  const owner = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const depositedUsdc = data.readBigUInt64LE(offset);
  offset += 8;

  const eligible = data[offset] !== 0;
  offset += 1;

  const lastDepositEpoch = data.readBigUInt64LE(offset);
  offset += 8;

  const lastDepositTime = data.readBigInt64LE(offset);
  offset += 8;

  const bump = data[offset];

  return {
    owner,
    depositedUsdc,
    eligible,
    lastDepositEpoch,
    lastDepositTime,
    bump,
  };
};

/**
 * Fetch GlobalState from blockchain
 */
export const getGlobalState = async (): Promise<GlobalState> => {
  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );

  const account = await withRpcFallback("getGlobalState", (conn) =>
    conn.getAccountInfo(globalStatePda)
  );
  if (!account) {
    throw new Error("GlobalState account not found");
  }

  const rawData = account.data;
  let data = rawData;
  if (
    rawData.length === GLOBAL_STATE_LEN_V1 + 8 ||
    rawData.length === GLOBAL_STATE_LEN_V2 + 8
  ) {
    data = rawData.slice(8);
  }

  if (data.length < GLOBAL_STATE_LEN_V1) {
    console.warn(
      `⚠️  Warning: Account data is ${data.length} bytes, expected at least ${GLOBAL_STATE_LEN_V1} bytes.`
    );
    console.warn("   GlobalState may be partially initialized.");
  }

  return parseGlobalState(data);
};

/**
 * Fetch vault USDC balance
 */
export const getVaultBalance = async (): Promise<bigint> => {
  const [vaultPda] = await PublicKey.findProgramAddress(
    [Buffer.from("vault")],
    programId
  );

  const balance = await withRpcFallback("getVaultBalance", (conn) =>
    conn.getTokenAccountBalance(vaultPda)
  );
  return BigInt(balance.value.amount);
};

/**
 * Get all participant accounts for current epoch
 */
export const getParticipantsByEpoch = async (
  epoch: bigint,
  options?: { minDepositTime?: bigint }
): Promise<ParticipantSnapshot[]> => {
  try {
    const programAccounts = await withRpcFallback("getParticipantsByEpoch", (conn) =>
      conn.getProgramAccounts(programId)
    );

    const participants: ParticipantSnapshot[] = [];

    for (const account of programAccounts) {
      if (account.account.data.length < 58) continue;

      try {
        const parsed = parseParticipant(account.account.data);
        const passesTimeFilter =
          options?.minDepositTime === undefined || parsed.lastDepositTime >= options.minDepositTime;

        if (parsed.lastDepositEpoch === epoch && parsed.eligible && passesTimeFilter) {
          participants.push({
            owner: parsed.owner.toString(),
            depositedUsdc: Number(parsed.depositedUsdc),
            eligible: parsed.eligible,
            lastDepositTime: Number(parsed.lastDepositTime),
          });
        }
      } catch (err) {
        continue;
      }
    }

    return participants;
  } catch (err) {
    console.error("Error fetching participants:", err);
    return [];
  }
};

/**
 * Helper: Find global state PDA
 */
export const getGlobalStatePda = async (): Promise<PublicKey> => {
  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );
  return globalStatePda;
};

export const getVaultPda = async (): Promise<PublicKey> => {
  const [vaultPda] = await PublicKey.findProgramAddress(
    [Buffer.from("vault")],
    programId
  );
  return vaultPda;
};
