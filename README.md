# ReverseRug (Public Repository)

This folder is a **public-safe copy** of the project, prepared for sharing and review.

## What This Project Does

ReverseRug is a Solana-based weekly pool system:

- Users join a round with a fixed `100 USDC` entry.
- Minimum `20` participants is required for normal settlement.
- Winner count scales as `floor(participants / 20)`.
- At settlement:
  - `10%` platform fee is taken first.
  - Fee split: `5%` project wallet + `5%` buyback wallet.
  - Non-winners receive `50 USDC` refund.
  - Remaining pool is split equally across winners.
- Late-join lock can delay claim/refund for configured duration (`86400s` default).

## Repository Structure

- `backend/onchain`: Anchor Solana smart contract
- `backend/offchain`: API + round management + settlement scripts
- `ReverseRug-Front`: user/admin frontend
- `docker-compose*.yml`: deployment options

## Security / Privacy Notes

- Sensitive files are intentionally excluded from this public copy:
  - `.env` files
  - private key/keypair files
  - local runtime artifacts (`node_modules`, `dist`, logs)
- Use `.env.example` files to create your own local config.

## Quick Start

1. Copy env templates:
   - `backend/offchain/.env.example` -> `backend/offchain/.env`
   - `ReverseRug-Front/.env.example` -> `ReverseRug-Front/.env`
2. Fill real values:
   - RPC URL
   - Program ID
   - Admin wallet(s)
   - Fee token accounts
   - Authority keypair path
3. Install and run:
   - Backend: `cd backend/offchain && npm install && npm run build && npm run server:dist`
   - Frontend: `cd ReverseRug-Front && npm install && npm run dev`

## Deployment

- `docker-compose.traefik.yml` is sanitized and uses placeholder domains/wallets.
- Replace `yourdomain.com` and wallet/program placeholders before production use.
