# Backend

This directory contains the on-chain and off-chain components of the Solana reward pool.

## Flow
1. Deposit: users join the weekly round with a fixed **100 USDC**.
2. End-of-week cron checks participant count.
3. If participants are below 20: a fixed **100 USDC** fee is taken, and the remaining amount is refunded evenly.
4. If participants are 20 or more: **10%** platform fee is split equally (dev + buyback), non-winners receive **50 USDC**, and the remainder is split across winners.
5. Distribution data and Merkle tree are generated, then the root is written on-chain.
6. Users claim with Merkle proofs; late joiners are delayed by the configured lock window.

## Folders
- `onchain/`: Solana program implementation and on-chain docs.
- `offchain/`: Scheduler, settlement pipeline, Merkle generation, and API service.
- `scripts/`: Operational helper scripts.

## Notes
- Owner withdrawal is intentionally blocked at contract level.
- USD threshold checks are handled off-chain and committed via on-chain root updates.
- RPC credentials and signer key material must be managed via a secrets manager or KMS in production.
