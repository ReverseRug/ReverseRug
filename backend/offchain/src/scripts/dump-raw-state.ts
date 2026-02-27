import "dotenv/config";
import { config } from "../config/index.js";
import { Connection, PublicKey } from "@solana/web3.js";

const main = async () => {
  const connection = new Connection(config.rpcUrl, "confirmed");
  const programId = new PublicKey(config.programId);
  const [pda] = await PublicKey.findProgramAddress([Buffer.from("global_state")], programId);
  console.log("GlobalState PDA:", pda.toBase58());
  const account = await connection.getAccountInfo(pda);
  if (!account) {
    console.log("Account not found");
    process.exit(0);
  }
  console.log("lamports:", account.lamports);
  console.log("owner:", account.owner.toBase58());
  console.log("data length:", account.data.length);
  console.log("data (base64):", account.data.toString("base64"));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
