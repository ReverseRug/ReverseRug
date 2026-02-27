import dotenv from "dotenv";

dotenv.config({ path: ".env.devnet", override: true });

interface Config {
  rpcUrl: string;
  programId: string;
  usdcMint: string;
  vaultPda?: string;
  cronKeypair: string;
  minDepositUsd: number;
  epochDurationDays: number;
  minParticipants: number;
  winnersPerParticipants: number;
  feeBps: number;
  refundUsd: number;
  fixedFeeUsd: number;
  devFeeAccount?: string;
  buybackFeeAccount?: string;
  distributorType: "streamflow" | "jupiter" | "custom";
  streamflowProgramId?: string;
  streamflowApiKey?: string;
  priceFeedPyth?: string;
  priceFeedSwitchboard?: string;
  proofBucketPath?: string;
  distributionApiUrl?: string;
}

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing env ${key}`);
  return value;
};

export const config: Config = {
  rpcUrl: getEnv("RPC_URL"),
  programId: getEnv("PROGRAM_ID"),
  usdcMint: getEnv("USDC_MINT"),
  vaultPda: process.env.VAULT_PDA,
  cronKeypair: getEnv("CRON_KEYPAIR"),
  minDepositUsd: Number(getEnv("MIN_DEPOSIT_USD", "100000000")),
  epochDurationDays: Number(getEnv("EPOCH_DURATION_DAYS", "7")),
  minParticipants: Number(getEnv("MIN_PARTICIPANTS", "20")),
  winnersPerParticipants: Number(getEnv("WINNERS_PER_PARTICIPANTS", "20")),
  feeBps: Number(getEnv("FEE_BPS", "1000")),
  refundUsd: Number(getEnv("REFUND_USD", "50")),
  fixedFeeUsd: Number(getEnv("FIXED_FEE_USD", "100")),
  devFeeAccount: process.env.DEV_FEE_ACCOUNT,
  buybackFeeAccount: process.env.BUYBACK_FEE_ACCOUNT,
  distributorType: (process.env.DISTRIBUTOR_TYPE as Config["distributorType"]) ?? "custom",
  streamflowProgramId: process.env.STREAMFLOW_PROGRAM_ID,
  streamflowApiKey: process.env.STREAMFLOW_API_KEY,
  priceFeedPyth: process.env.PYTH_PRICE_ACCOUNT,
  priceFeedSwitchboard: process.env.SWITCHBOARD_FEED_ADDRESS,
  proofBucketPath: process.env.PROOF_BUCKET_PATH,
  distributionApiUrl: process.env.DISTRIBUTION_API_URL,
};
