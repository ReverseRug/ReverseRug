import { PublicKey, Connection } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const programId = new PublicKey("2T9Vs1DjHd9oqtzT8oTaRqrtThBDdHJKSZuvWvRFf6np");

const [globalStatePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_state")],
  programId
);

const acc = await connection.getAccountInfo(globalStatePda);
if (!acc) {
  console.log("Account not found");
} else {
  console.log("Account data size:", acc.data.length, "bytes");
  console.log("Expected size: 254 bytes");
  console.log("Difference:", 254 - acc.data.length, "bytes");
  
  if (acc.data.length === 185) {
    console.log("\n=> Account has OLD format (185 bytes)");
    console.log("   Missing: is_vault_locked (1 byte) + locked_until (8 bytes) = 9 bytes");
  } else if (acc.data.length === 254) {
    console.log("\n=> Account has NEW format (254 bytes) ✅");
  }
}
