import axios from "axios";
import { config } from "../config/index.js";

export const fetchUsdcUsd = async (): Promise<number> => {
  // TODO: Replace with on-chain Pyth/Switchboard fetch.
  const fallback = 1;
  if (!config.priceFeedPyth && !config.priceFeedSwitchboard) return fallback;
  // Placeholder external call; should be replaced with oracle client.
  const res = await axios.get("https://api.coinbase.com/v2/prices/USDC-USD/spot");
  const price = Number(res.data?.data?.amount ?? fallback);
  return Number.isFinite(price) ? price : fallback;
};
