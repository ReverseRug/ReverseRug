# Reward Pool - Solana Program (Anchor)

Weekly reward distribution smart contract for Solana.

## Architecture

### State accounts
- **GlobalState**: pool configuration, epoch metadata, Merkle root.
- **Participant**: per-user deposit and eligibility state.
- **ClaimRecord**: epoch-based claim tracking to prevent duplicate claims.

### Instructions
1. **initialize**: creates and configures the pool.
2. **deposit**: user deposits fixed **100 USDC** once per epoch.
3. **distribute_fees**: admin routes fee split to dev and buyback accounts.
4. **finalize_epoch**: admin writes Merkle root from off-chain computation.
5. **claim**: user claims allocation using Merkle proof.
6. **start_epoch**: starts next epoch and resets root state.

### Security model
- No owner withdrawal path from vault.
- Merkle proof verification (`keccak256`).
- Epoch-based claim protection.
- Admin authority checks on finalize/start instructions.

## Setup

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked

# Dependencies
cd backend/onchain
npm install

# Build
anchor build

# Test (local validator)
anchor test

# Deploy (devnet)
anchor deploy --provider.cluster devnet
```

## Deployment

### Devnet
```bash
solana-keygen new -o ~/.config/solana/devnet-authority.json
solana airdrop 2 -u devnet -k ~/.config/solana/devnet-authority.json
anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/devnet-authority.json
```

### Mainnet
```bash
# Recommended: KMS/HSM-backed signer process
anchor deploy --provider.cluster mainnet --provider.wallet ~/.config/solana/mainnet-authority.json
```

## IDL

After deployment, `target/idl/reward_pool.json` is generated.
Copy this IDL to the off-chain service and frontend clients.

```bash
# Initial IDL publish
anchor idl init --filepath target/idl/reward_pool.json <PROGRAM_ID>

# IDL upgrade
anchor idl upgrade --filepath target/idl/reward_pool.json <PROGRAM_ID>
```

## Post-deploy updates
- `Anchor.toml`: update program IDs per cluster.
- `backend/offchain/.env*`: set `PROGRAM_ID`.
- Frontend env: set `VITE_PROGRAM_ID`.

## Off-chain integration
The off-chain service should:
1. Read global state.
2. Read eligible participants.
3. Compute payouts.
4. Generate Merkle tree.
5. Send `finalize_epoch`.
6. Serve proofs.
7. Trigger `start_epoch` on schedule.
