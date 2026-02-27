# Backend Overview

The backend is split into two cooperating layers:

- `onchain`: trusted enforcement layer (program rules and state transitions)
- `offchain`: deterministic computation layer (payout calculation, Merkle generation, orchestration)

This split keeps business-critical invariants enforced on-chain while allowing scalable off-chain computation and scheduling.

## Core Flow

1. Users deposit fixed `100 USDC` into the active epoch.
2. At epoch end, the off-chain job computes allocations from canonical participant state.
3. The job builds a Merkle tree and finalizes the epoch root on-chain.
4. Users claim with proof; claims are verified against the finalized root.
5. Next epoch starts under admin-controlled scheduling rules.

## Security Properties

- Vault is not withdrawable by owner-only shortcut paths.
- Claims require proof and epoch consistency.
- Finalization and epoch transitions require authorized signer checks.
- Sensitive operational values are env-driven and expected from a secrets manager.

## Directory Map

- `onchain/`: Anchor program and on-chain docs
- `offchain/`: scheduler, API, payout engine, Merkle helpers
- `scripts/`: maintenance and operational utility scripts
