use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

/// Tracks claims per epoch per user
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ClaimRecord {
    /// Epoch number
    pub epoch: u64,
    /// User wallet
    pub user: Pubkey,
    /// Amount claimed
    pub amount_claimed: u64,
    /// Timestamp
    pub claimed_at: i64,
    /// Bump
    pub bump: u8,
}

impl ClaimRecord {
    pub const LEN: usize = 
        8 +  // epoch
        32 + // user
        8 +  // amount_claimed
        8 +  // claimed_at
        1;   // bump
}
