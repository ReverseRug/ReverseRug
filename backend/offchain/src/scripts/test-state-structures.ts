import "dotenv/config";

const mockGlobalState = {
  authority: "Fg6PaFpoGXkYsLMsmJAc16hy3EUE8jhxksxXWqVpXpgG",
  usdcMint: "4G8Ab8tthh9bdQkBR1ro6JQmPSWprkYfWzwN4w72Aj58",
  vault: "5p9oXNRfnNCLmYYuEV13e1qzHkLmQMHZLNfLwMdXnLYr",
  minDepositUsd: 100000000n,
  thresholdUsd: 1000000000n,
  currentEpoch: 5n,
  epochStart: 1708000000n,
  epochDuration: 7n * 24n * 60n * 60n,
  merkleRoot: "00".repeat(32),
  totalPayout: 0n,
  feeTakenEpoch: 0n,
  carryoverEpoch: 0n,
};

const formatUsd = (amount: bigint) => (Number(amount) / 1e6).toFixed(2);

const main = () => {
  console.log("🧪 GlobalState Structure Check (Mock Data)");
  console.log("");
  console.log("📊 Basic Configuration:");
  console.log(`  Authority:        ${mockGlobalState.authority}`);
  console.log(`  USDC Mint:        ${mockGlobalState.usdcMint}`);
  console.log(`  Vault:            ${mockGlobalState.vault}`);
  console.log("");

  console.log("💰 Deposit Requirements:");
  console.log(`  Min Deposit:      $${formatUsd(mockGlobalState.minDepositUsd)} USD`);
  console.log(`  Threshold:        $${formatUsd(mockGlobalState.thresholdUsd)} USD`);
  console.log("");

  const epochStartMs = Number(mockGlobalState.epochStart) * 1000;
  const epochEndMs = epochStartMs + Number(mockGlobalState.epochDuration) * 1000;

  console.log("⏰ Epoch Information:");
  console.log(`  Current Epoch:    ${mockGlobalState.currentEpoch}`);
  console.log(`  Epoch Start:      ${new Date(epochStartMs).toISOString()}`);
  console.log(`  Epoch End:        ${new Date(epochEndMs).toISOString()}`);
  console.log("");

  console.log("✅ GlobalState structure OK");
};

main();
