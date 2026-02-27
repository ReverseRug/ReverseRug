import "dotenv/config";
import fs from "node:fs";
import { Keypair, PublicKey } from "@solana/web3.js";
import { connection, getGlobalState, programId } from "../lib/rpc.js";
import { config } from "../config/index.js";

const loadSigner = (): Keypair => {
  const keypairPath = process.env.USER_KEYPAIR || process.env.PARTICIPANT_KEYPAIR || config.cronKeypair;
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
  const user = loadSigner();
  const globalState = await getGlobalState();
  const epoch = Number(globalState.currentEpoch);

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), user.publicKey.toBuffer(), toU64Le(globalState.currentEpoch)],
    programId
  );

  const accountInfo = await connection.getAccountInfo(participantPda);
  if (!accountInfo) {
    throw new Error(`Participant account not found for epoch ${epoch}`);
  }

  const data = Buffer.from(accountInfo.data);
  let offset = 0;

  const owner = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const depositedUsdc = data.readBigUInt64LE(offset);
  offset += 8;

  const eligible = data.readUInt8(offset) === 1;
  offset += 1;

  const lastDepositEpoch = data.readBigUInt64LE(offset);
  offset += 8;

  const lastDepositTime = data.readBigInt64LE(offset);
  offset += 8;

  const bump = data.readUInt8(offset);

  console.log("Participant State");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Owner: ${owner.toBase58()}`);
  console.log(`Epoch: ${epoch}`);
  console.log(`Deposited USDC: ${depositedUsdc}`);
  console.log(`Eligible: ${eligible}`);
  console.log(`Last Deposit Epoch: ${lastDepositEpoch}`);
  console.log(`Last Deposit Time: ${lastDepositTime}`);
  console.log(`Bump: ${bump}`);
};

main().catch((err) => {
  console.error("get-participant failed:", err);
  process.exit(1);
});
