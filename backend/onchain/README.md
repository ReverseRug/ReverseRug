# ReverseRug On-Chain Program (Anchor)

The on-chain program is the protocol's trust anchor. It stores canonical round state, validates privileged operations, and enforces claim safety.

## Program Responsibilities

- Track global protocol state (`GlobalState`)
- Track per-user epoch participation (`Participant`)
- Track claim execution by epoch (`ClaimRecord`)
- Validate and process claim instructions against finalized Merkle root

## Instruction Set

1. `initialize`: configure protocol state
2. `deposit`: accept fixed-entry user participation (`100 USDC`)
3. `distribute_fees`: route fee split to configured token accounts
4. `finalize_epoch`: publish Merkle root produced off-chain
5. `claim`: verify proof and transfer claim amount
6. `start_epoch`: advance to the next round

## Security Model

- No direct owner withdrawal instruction for vault funds
- Proof-based claim authorization (`keccak256` Merkle verification)
- Epoch-aware claim tracking to prevent duplicate redemption
- Authority-gated finalize/start operations

## Build and Test

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked

cd backend/onchain
npm install

# Build
anchor build

# Local tests
anchor test
```

## Deploy

```bash
# Example: devnet
solana-keygen new -o ~/.config/solana/devnet-authority.json
solana airdrop 2 -u devnet -k ~/.config/solana/devnet-authority.json
anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/devnet-authority.json
```

```bash
# Example: mainnet (recommended signer process: KMS/HSM-backed)
anchor deploy --provider.cluster mainnet --provider.wallet ~/.config/solana/mainnet-authority.json
```

## IDL Workflow

After deployment, `target/idl/reward_pool.json` is generated and should be distributed to off-chain and frontend clients.

```bash
anchor idl init --filepath target/idl/reward_pool.json <PROGRAM_ID>
anchor idl upgrade --filepath target/idl/reward_pool.json <PROGRAM_ID>
```

## Integration Contract

The off-chain service is expected to:

1. read protocol state and participants
2. compute deterministic allocations
3. generate Merkle tree and proofs
4. submit `finalize_epoch`
5. expose proofs for client claim flow
6. trigger `start_epoch` on schedule
