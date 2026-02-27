import axios from "axios";
import FormData from "form-data";
import BN from "bn.js";
import { ICluster } from "@streamflow/common";
import { SolanaDistributorClient } from "@streamflow/distributor/solana";
import { Keypair } from "@solana/web3.js";
import { DistributionShare } from "../types/index.js";
import { config } from "../config/index.js";

interface StreamflowMerkleResponse {
  merkleRoot: string;
  maxNumNodes: number | string;
  maxTotalClaim: string | number;
}

const buildCsv = (shares: DistributionShare[]): Buffer => {
  const header = "pubkey,amount_unlocked,amount_locked,category\n";
  const rows = shares.map(
    (s) => `${s.owner},${s.amount.toString()},0,Staker`
  );
  return Buffer.from(header + rows.join("\n"), "utf-8");
};

const getCluster = (): ICluster => {
  const network = (process.env.SOLANA_NETWORK ?? "devnet").toLowerCase();
  return network === "mainnet" || network === "mainnet-beta"
    ? ICluster.Mainnet
    : ICluster.Devnet;
};

export const createStreamflowAirdrop = async (
  shares: DistributionShare[],
  epoch: number,
  signer: Keypair
): Promise<string> => {
  if (!config.streamflowApiKey) {
    throw new Error("Missing STREAMFLOW_API_KEY in env");
  }

  const csv = buildCsv(shares);
  const form = new FormData();
  form.append("mint", config.usdcMint);
  form.append("name", `Reverserug Epoch ${epoch}`);
  form.append("file", csv, { filename: `epoch-${epoch}.csv` });

  const res = await axios.post<StreamflowMerkleResponse>(
    "https://api-public.streamflow.finance/v2/api/airdrops/",
    form,
    {
      headers: {
        ...form.getHeaders(),
        "x-api-key": config.streamflowApiKey,
      },
    }
  );

  const merkleResponse = res.data;
  if (!merkleResponse?.merkleRoot) {
    throw new Error("Streamflow API response missing merkleRoot");
  }

  const client = new SolanaDistributorClient({
    clusterUrl: config.rpcUrl,
    cluster: getCluster(),
    apiUrl: "https://api-public.streamflow.finance",
  });

  const now = Math.floor(Date.now() / 1000);
  const end = now + config.epochDurationDays * 24 * 60 * 60;

  // Convert merkle root hex string to number array
  const rootHex = merkleResponse.merkleRoot.startsWith("0x") 
    ? merkleResponse.merkleRoot.slice(2) 
    : merkleResponse.merkleRoot;
  const rootArray = Array.from(Buffer.from(rootHex, "hex"));

  const createParams = {
    version: 0,
    root: rootArray,
    maxNumNodes: new BN(merkleResponse.maxNumNodes).toString(),
    maxTotalClaim: new BN(merkleResponse.maxTotalClaim),
    mint: config.usdcMint,
    unlockPeriod: 1,
    startVestingTs: now,
    endVestingTs: end,
    clawbackStartTs: end + 60,
    claimsClosableByAdmin: false,
    claimsClosableByClaimant: false,
  };

  const solanaParams = {
    invoker: signer as any, // Type cast to bypass Keypair instance mismatch
  };

  const result = await client.create(createParams, solanaParams);
  const distributorId = (result as { metadataId?: string }).metadataId;
  if (!distributorId) {
    throw new Error("Streamflow create did not return distributor id");
  }

  return distributorId;
};
