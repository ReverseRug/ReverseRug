// Deployment script for reward-pool program
// Run: anchor migrate

import * as anchor from "@coral-xyz/anchor";

module.exports = async function (provider: anchor.AnchorProvider) {
  anchor.setProvider(provider);

  console.log("Deploying to:", provider.connection.rpcEndpoint);
  console.log("Wallet:", provider.wallet.publicKey.toString());
  
  // Add initialization logic here if needed
};
