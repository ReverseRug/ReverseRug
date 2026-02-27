use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum RewardPoolError {
    #[error("Unauthorized: only admin can perform this action")]
    Unauthorized,
    
    #[error("Deposit amount below minimum threshold")]
    BelowMinimum,

    #[error("Deposit amount must match fixed entry")]
    InvalidDepositAmount,

    #[error("Already participated in this epoch")]
    AlreadyParticipated,

    #[error("Deposit locked due to carryover")]
    CarryoverLocked,
    
    #[error("Invalid merkle proof")]
    InvalidProof,
    
    #[error("Already claimed for this epoch")]
    AlreadyClaimed,
    
    #[error("Epoch not finalized")]
    EpochNotFinalized,
    
    #[error("Invalid epoch")]
    InvalidEpoch,
    
    #[error("Insufficient pool balance")]
    InsufficientBalance,
    
    #[error("Arithmetic overflow")]
    Overflow,
    
    #[error("Epoch already finalized")]
    EpochAlreadyFinalized,

    #[error("Claim locked for late entrants")]
    ClaimLocked,

    #[error("Fee already distributed for this epoch")]
    FeeAlreadyTaken,

    #[error("Carryover already set for this epoch")]
    CarryoverAlreadySet,

    #[error("Not in carryover state")]
    NotInCarryover,

    #[error("Vault is locked until distribution completes")]
    VaultLocked,
}

impl From<RewardPoolError> for ProgramError {
    fn from(e: RewardPoolError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
