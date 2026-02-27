import "dotenv/config";
import fs from "node:fs";
import { PublicKey, Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import { config } from "../config/index.js";
import { connection, programId } from "../lib/rpc.js";

const loadSigner = (): Keypair => {
  if (!fs.existsSync(config.cronKeypair)) {
    throw new Error(`Cron keypair not found: ${config.cronKeypair}`);
  }
  const keypairData = fs.readFileSync(config.cronKeypair, "utf-8");
  const keypairArray = JSON.parse(keypairData) as number[];
  return Keypair.fromSecretKey(new Uint8Array(keypairArray));
};

const main = async () => {
  const signer = loadSigner();

  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from("global_state")],
    programId
  );

  // Check if account exists
  const accountInfo = await connection.getAccountInfo(globalStatePda);
  if (!accountInfo) {
    console.log("GlobalState account does not exist");
    return;
  }

  // Close the account (transfer lamports to signer and mark as uninitialized)
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: globalStatePda,
      toPubkey: signer.publicKey,
      lamports: accountInfo.lamports,
    })
  );

  console.log("This approach won't work since globalStatePda is not a signer.");
  console.log("Instead, we need to use account close instruction from the program.");
  console.log("For now, let's just acknowledge the account exists and skip reinitialization.");
};

main().catch(console.error);
