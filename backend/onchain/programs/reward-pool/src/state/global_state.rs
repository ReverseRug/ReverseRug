use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct GlobalState {
    /// Authority pubkey (admin)
    pub authority: Pubkey,
    /// USDC mint address
    pub usdc_mint: Pubkey,
    /// Vault token account (PDA)
    pub vault: Pubkey,
    /// Minimum deposit in USD (with 6 decimals, e.g., 100_000_000 = $100)
    pub min_deposit_usd: u64,
    /// Threshold in USD (e.g., 1000_000_000 = $1000)
    pub threshold_usd: u64,
    /// Current epoch number
    pub current_epoch: u64,
    /// Epoch start timestamp
    pub epoch_start: i64,
    /// Epoch duration in seconds (7 days)
    pub epoch_duration: i64,
    /// Current merkle root for active distribution
    pub merkle_root: [u8; 32],
    /// Total payout for current epoch
    pub total_payout: u64,
    /// Epoch number where fees were last distributed
    pub fee_taken_epoch: u64,
    /// Epoch number carried over when below minimum participants
    pub carryover_epoch: u64,
    /// Whether vault is locked to prevent withdrawals
    pub is_vault_locked: bool,
    /// Unix timestamp until vault is locked
    pub locked_until: i64,
    /// Bump seed for PDA
    pub bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 
        32 + // authority
        32 + // usdc_mint
        32 + // vault
        8 +  // min_deposit_usd
        8 +  // threshold_usd
        8 +  // current_epoch
        8 +  // epoch_start
        8 +  // epoch_duration
        32 + // merkle_root
        8 +  // total_payout
        8 +  // fee_taken_epoch
        8 +  // carryover_epoch
        1 +  // is_vault_locked
        8 +  // locked_until
        1;   // bump
}
