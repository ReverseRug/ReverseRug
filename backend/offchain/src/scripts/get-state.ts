import "dotenv/config";
import { getGlobalState } from "../lib/rpc.js";

async function main() {
  try {
    console.log("📋 Fetching GlobalState...\n");

    const globalState = await getGlobalState();

    console.log("═══════════════════════════════════════════════════════════");
    console.log("                    GLOBAL STATE                           ");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("");

    console.log("📊 Basic Configuration:");
    console.log(`  Authority:        ${globalState.authority.toBase58()}`);
    console.log(`  USDC Mint:        ${globalState.usdcMint.toBase58()}`);
    console.log(`  Vault:            ${globalState.vault.toBase58()}`);
    console.log("");

    console.log("💰 Deposit Requirements:");
    console.log(`  Min Deposit:      $${(Number(globalState.minDepositUsd) / 1e6).toFixed(2)} USD`);
    console.log(`  Threshold:        $${(Number(globalState.thresholdUsd) / 1e6).toFixed(2)} USD`);
    console.log("");

    console.log("⏰ Epoch Information:");
    console.log(`  Current Epoch:    ${globalState.currentEpoch}`);
    console.log(`  Epoch Start:      ${new Date(Number(globalState.epochStart) * 1000).toISOString()}`);
    const epochDuration = Number(globalState.epochDuration) / 86400;
    console.log(`  Epoch Duration:   ${epochDuration.toFixed(1)} days`);
    const epochEnd = new Date((Number(globalState.epochStart) + Number(globalState.epochDuration)) * 1000);
    console.log(`  Epoch End:        ${epochEnd.toISOString()}`);
    console.log("");

    console.log("📈 Distribution:");
    console.log(`  Merkle Root:      ${Buffer.from(globalState.merkleRoot).toString("hex").substring(0, 32)}...`);
    console.log(`  Total Payout:     ${globalState.totalPayout} USDC (6 decimals)`);
    console.log(`  Fee Taken Epoch:  ${globalState.feeTakenEpoch}`);
    console.log(`  Carryover Epoch:  ${globalState.carryoverEpoch}`);
    console.log("");

    console.log("🎲 Randomness:");
    console.log("  Source:          blockhash (off-chain)");
    console.log("  Note:            Seed is derived during distribution job");
    console.log("");

    console.log("═══════════════════════════════════════════════════════════");
    console.log("");

    // Recommendations
    console.log("📋 Recommendations:");
    console.log("  ✅ Ready for distribution (randomness derived off-chain)");
    console.log("");

  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
