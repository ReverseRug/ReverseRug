# Off-Chain Service

This package contains weekly scheduling, payout calculation, Merkle generation, and root publication.

## Components
- `jobs/weekly-distribution.ts`: weekly settlement pipeline (cron or one-shot run).
- `lib/rpc.ts`: Solana RPC access, program and vault reads.
- `lib/merkle.ts`: distribution list and Merkle tree generation.
- `config/`: env loading and shared constants.
- `types/`: shared data models.

## Pipeline
1. Read participants from RPC and compute round totals.
2. If participants are below 20: fixed fee plus equal refund plan.
3. If participants are 20 or more: 10% fee, 50 USDC non-winner refund, and winner split (1 winner per 20 participants).
4. Send fee transfer instruction, build Merkle tree, and publish root on-chain.
5. Serve proof JSON through the API.
6. Emit logs and alerts on failed transactions.

## Runtime requirements
- Solana RPC endpoint
- Program ID and token account addresses
- Admin wallet public key(s)
- Domain/subdomain for API hosting
- Oracle feed addresses if price verification is enabled

## Run
- Copy `.env.example` to `.env` or `.env.devnet` based on your environment.
- Install dependencies in `backend/offchain`.
- Run `npm run build && npm run weekly` or trigger via cron.
