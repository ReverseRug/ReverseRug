use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum RewardPoolInstruction {
    /// Initialize the global pool state
    /// 
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` GlobalState PDA
    /// 2. `[writable]` Token Vault
    /// 3. `[]` USDC Mint
    /// 4. `[]` Token Program
    /// 5. `[]` System Program
    /// 6. `[]` Rent Sysvar
    Initialize {
        min_deposit_usd: u64,
        threshold_usd: u64,
        epoch_duration_secs: i64,
    },

    /// User deposits USDC
    /// 
    /// Accounts:
    /// 0. `[writable]` Participant PDA
    /// 1. `[writable]` ParticipantRegistry PDA
    /// 2. `[writable]` GlobalState PDA
    /// 3. `[signer]` User
    /// 4. `[writable]` User Token Account
    /// 5. `[writable]` Vault Token Account
    /// 6. `[]` Token Program
    /// 7. `[]` System Program
    Deposit { amount: u64 },

    /// Admin finalizes epoch and sets merkle root
    /// 
    /// Accounts:
    /// 0. `[writable]` GlobalState PDA
    /// 1. `[signer]` Authority
    FinalizeEpoch {
        epoch: u64,
        merkle_root: [u8; 32],
        total_payout: u64,
    },

    /// User claims reward with merkle proof
    /// 
    /// Accounts:
    /// 0. `[writable]` ClaimRecord PDA
    /// 1. `[]` GlobalState PDA
    /// 2. `[signer]` User
    /// 3. `[writable]` User Token Account
    /// 4. `[writable]` Vault Token Account
    /// 5. `[]` Token Program
    /// 6. `[]` System Program
    Claim {
        epoch: u64,
        amount: u64,
        proof: Vec<[u8; 32]>,
    },

    /// Admin starts new epoch
    /// 
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` GlobalState PDA
    StartEpoch {
        epoch_duration_secs: i64,
    },

    /// Admin marks current epoch as carryover
    ///
    /// Accounts:
    /// 0. `[writable]` GlobalState PDA
    /// 1. `[signer]` Authority
    MarkCarryover {
        epoch: u64,
    },

    /// Admin refunds a participant before carryover
    ///
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` GlobalState PDA
    /// 2. `[writable]` Participant PDA
    /// 3. `[writable]` ParticipantRegistry PDA
    /// 4. `[writable]` Vault Token Account
    /// 5. `[writable]` Recipient Token Account
    /// 6. `[]` Token Program
    AdminRefund {
        epoch: u64,
        amount: u64,
    },

    /// Admin distributes fee to dev + buyback token accounts
    ///
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` GlobalState PDA
    /// 2. `[writable]` Vault Token Account
    /// 3. `[writable]` Dev Fee Token Account
    /// 4. `[writable]` Buyback Fee Token Account
    /// 5. `[]` Token Program
    DistributeFees {
        epoch: u64,
        dev_amount: u64,
        buyback_amount: u64,
    },

    /// User withdraws 50% of deposit during carryover
    ///
    /// Accounts:
    /// 0. `[signer]` User
    /// 1. `[]` GlobalState PDA
    /// 2. `[writable]` Participant PDA
    /// 3. `[writable]` ParticipantRegistry PDA
    /// 4. `[writable]` Vault Token Account
    /// 5. `[writable]` User Token Account
    /// 6. `[]` Token Program
    PartialWithdraw {
        epoch: u64,
    },

    /// Admin locks vault to prevent withdrawals after distribution finalized
    ///
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` GlobalState PDA
    LockVault {
        duration_secs: i64,
    },

    /// Admin reinitializes GlobalState (for schema upgrades)
    ///
    /// Accounts:
    /// 0. `[signer]` Authority
    /// 1. `[writable]` GlobalState PDA
    ReInitialize {
        min_deposit_usd: u64,
        threshold_usd: u64,
    },

}
