use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Participant {
    /// Owner wallet
    pub owner: Pubkey,
    /// Total USDC deposited in current epoch
    pub deposited_usdc: u64,
    /// Eligible for distribution
    pub eligible: bool,
    /// Last deposit epoch
    pub last_deposit_epoch: u64,
    /// Last deposit timestamp (for 24h check)
    pub last_deposit_time: i64,
    /// Bump seed
    pub bump: u8,
}

impl Participant {
    pub const LEN: usize = 
        32 + // owner
        8 +  // deposited_usdc
        1 +  // eligible
        8 +  // last_deposit_epoch
        8 +  // last_deposit_time
        1;   // bump
}
