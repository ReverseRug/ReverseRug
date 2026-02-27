# ReverseRug

ReverseRug is a Solana-based USDC round protocol focused on transparent rules, deterministic settlement, and auditable payout flows.

## Why ReverseRug

Traditional round systems are often opaque: users cannot verify how funds are handled or how payouts are calculated. ReverseRug is designed to make the full lifecycle inspectable:

- Fixed-entry rounds (`100 USDC`) with explicit settlement rules
- Deterministic payout computation based on participant count
- On-chain settlement anchors via Merkle root finalization
- Public claim flow where allocations are verified by Merkle proof

## Security-First Design

ReverseRug is built around minimizing trust and limiting privileged actions:

- No owner withdrawal path from the prize vault
- Strict authority checks on admin-only instructions
- Epoch-scoped claim protection to prevent double-claiming
- Merkle proof validation for every claim
- Server-side round-window enforcement for operational APIs

## Settlement Model

- Users join with fixed `100 USDC`
- Normal settlement activates at `>= 20` participants
- Winners scale as `floor(participants / 20)`
- At settlement:
  - `10%` platform fee is split into dev + buyback accounts
  - Non-winners receive `50 USDC`
  - Remaining value is split equally among winners

## Repository Layout

- `backend/onchain`: Anchor Solana program
- `backend/offchain`: scheduler, payout engine, Merkle generation, API
- `ReverseRug-Front`: user/admin frontend
- `docker-compose.traefik.yml`: production-oriented deployment template

## Quick Start

1. Copy env templates:
   - `backend/offchain/.env.example` -> `backend/offchain/.env`
   - `ReverseRug-Front/.env.example` -> `ReverseRug-Front/.env`
2. Fill required values:
   - RPC URL
   - Program ID
   - Admin wallet allowlist
   - Fee token accounts
   - Signer keypair path
3. Run services:
   - Backend: `cd backend/offchain && npm install && npm run build && npm run server:dist`
   - Frontend: `cd ReverseRug-Front && npm install && npm run dev`

## Engineering Standards

This repository is maintained as production-grade application code:

- Secrets and key material are excluded from source control
- Infra-specific placeholders are used in public deployment manifests
- Component boundaries are explicit across on-chain, off-chain, and UI layers
- Security and release hygiene are documented in `SECURITY.md` and `PUBLIC_RELEASE_CHECKLIST.md`

## License

Apache-2.0
