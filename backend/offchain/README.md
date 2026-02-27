# ReverseRug Off-Chain Service

The off-chain service is responsible for deterministic payout computation, epoch orchestration, and proof delivery.

## Responsibilities

- Read participant and state data from Solana RPC
- Compute settlement allocations under protocol rules
- Build Merkle tree and publish root on-chain
- Serve proof payloads to frontend claim flow
- Run scheduled weekly distribution jobs

## Key Modules

- `jobs/weekly-distribution.ts`: settlement pipeline runner
- `lib/rpc.ts`: chain read helpers and account decoding
- `lib/merkle.ts`: payout list and tree generation
- `config/`: runtime env parsing and config guards
- `server/`: API layer for health, rounds, winners, and admin flows

## Determinism and Safety

- Payout logic is rule-driven and reproducible from chain state
- Root publication happens after allocation generation
- Admin actions are wallet allowlist controlled
- Runtime configuration is env-based and production-safe when paired with secret management

## Runtime Requirements

- Solana RPC endpoint(s)
- Program ID and token account addresses
- Admin wallet allowlist
- Domain/subdomain for API hosting
- Optional oracle feed addresses for price checks

## Run

```bash
cd backend/offchain
npm install
npm run build
npm run weekly
```

For API mode, run the server command defined in `package.json`.
