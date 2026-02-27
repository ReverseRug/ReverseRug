use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ParticipantRegistry {
    /// Owner wallet
    pub owner: Pubkey,
    /// Active epoch for deposit lock
    pub active_epoch: u64,
    /// Last deposit timestamp
    pub last_deposit_time: i64,
    /// Bump seed
    pub bump: u8,
}

impl ParticipantRegistry {
    pub const LEN: usize =
        32 + // owner
        8 +  // active_epoch
        8 +  // last_deposit_time
        1;   // bump
}
