use solana_program::{
    account_info::{AccountInfo, next_account_info},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    instruction::{AccountMeta, Instruction},
    msg,
    system_instruction,
    program::{invoke, invoke_signed},
    rent::Rent,
    sysvar::Sysvar,
    clock::Clock,
};
use std::str::FromStr;
use borsh::{BorshDeserialize, BorshSerialize};

use spl_token::instruction as token_instruction;

use crate::instruction::RewardPoolInstruction;
use crate::state::{GlobalState, Participant, ParticipantRegistry, ClaimRecord};
use crate::errors::RewardPoolError;

// Token Program constants
const SYSTEM_RENT_ID: &str = "SysvarRent111111111111111111111111111111111";

// Token account size (from SPL Token)
const TOKEN_ACCOUNT_SIZE: usize = 165;
// Production claim lock for late joiners: 24 hours.
const LATE_JOIN_CLAIM_LOCK_SECS: i64 = 24 * 60 * 60;

pub struct Processor;

// Helper function to safely deserialize GlobalState from potentially-sized accounts
fn deserialize_global_state(account_data: &[u8]) -> Result<GlobalState, ProgramError> {
    if account_data.len() < GlobalState::LEN {
        // Pad with zeros if account data is too small (for backwards compatibility)
        let mut padded = account_data.to_vec();
        padded.resize(GlobalState::LEN, 0);
        GlobalState::try_from_slice(&padded)
            .map_err(|_| ProgramError::InvalidAccountData)
    } else {
        GlobalState::try_from_slice(account_data)
            .map_err(|_| ProgramError::InvalidAccountData)
    }
}

impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = RewardPoolInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        match instruction {
            RewardPoolInstruction::Initialize {
                min_deposit_usd,
                threshold_usd,
                epoch_duration_secs,
            } => {
                msg!("Instruction: Initialize");
                Self::process_initialize(program_id, accounts, min_deposit_usd, threshold_usd, epoch_duration_secs)
            }
            RewardPoolInstruction::Deposit { amount } => {
                msg!("Instruction: Deposit");
                Self::process_deposit(program_id, accounts, amount)
            }
            RewardPoolInstruction::FinalizeEpoch {
                epoch,
                merkle_root,
                total_payout,
            } => {
                msg!("Instruction: FinalizeEpoch");
                Self::process_finalize_epoch(program_id, accounts, epoch, merkle_root, total_payout)
            }
            RewardPoolInstruction::Claim {
                epoch,
                amount,
                proof,
            } => {
                msg!("Instruction: Claim");
                Self::process_claim(program_id, accounts, epoch, amount, proof)
            }
            RewardPoolInstruction::StartEpoch { epoch_duration_secs } => {
                msg!("Instruction: StartEpoch");
                Self::process_start_epoch(program_id, accounts, epoch_duration_secs)
            }
            RewardPoolInstruction::DistributeFees {
                epoch,
                dev_amount,
                buyback_amount,
            } => {
                msg!("Instruction: DistributeFees");
                Self::process_distribute_fees(program_id, accounts, epoch, dev_amount, buyback_amount)
            }
            RewardPoolInstruction::MarkCarryover { epoch } => {
                msg!("Instruction: MarkCarryover");
                Self::process_mark_carryover(program_id, accounts, epoch)
            }
            RewardPoolInstruction::AdminRefund { epoch, amount } => {
                msg!("Instruction: AdminRefund");
                Self::process_admin_refund(program_id, accounts, epoch, amount)
            }
            RewardPoolInstruction::PartialWithdraw { epoch } => {
                msg!("Instruction: PartialWithdraw");
                Self::process_partial_withdraw(program_id, accounts, epoch)
            }
            RewardPoolInstruction::LockVault { duration_secs } => {
                msg!("Instruction: LockVault");
                Self::process_lock_vault(program_id, accounts, duration_secs)
            }
            RewardPoolInstruction::ReInitialize {
                min_deposit_usd,
                threshold_usd,
            } => {
                msg!("Instruction: ReInitialize");
                Self::process_reinitialize(program_id, accounts, min_deposit_usd, threshold_usd)
            }
        }
    }

    fn process_initialize(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        min_deposit_usd: u64,
        threshold_usd: u64,
        epoch_duration_secs: i64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        
        let authority = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;
        let vault = next_account_info(account_iter)?;
        let usdc_mint = next_account_info(account_iter)?;
        let token_program = next_account_info(account_iter)?;
        let system_program = next_account_info(account_iter)?;
        let rent_sysvar = next_account_info(account_iter)?;

        // Authority must be signer
        if !authority.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        // Get current time
        let clock = Clock::get()?;

        // Derive global_state PDA
        let (global_state_pda, global_state_bump) = Pubkey::find_program_address(
            &[b"global_state"],
            program_id,
        );

        if global_state.key != &global_state_pda {
            return Err(ProgramError::InvalidArgument);
        }

        // Create or reuse global_state account
        let rent = Rent::get()?;
        let required_lamports = rent.minimum_balance(GlobalState::LEN);

        if global_state.lamports() == 0 {
            // Account doesn't exist, create it
            invoke_signed(
                &system_instruction::create_account(
                    authority.key,
                    global_state.key,
                    required_lamports,
                    GlobalState::LEN as u64,
                    program_id,
                ),
                &[authority.clone(), global_state.clone(), system_program.clone()],
                &[&[b"global_state", &[global_state_bump]]],
            )?;
        } else {
            // Account exists, check if we need to reallocate
            let current_size = global_state.data.borrow().len();
            if current_size < GlobalState::LEN {
                msg!("Reallocating GlobalState from {} to {} bytes", current_size, GlobalState::LEN);
                
                // Realloc account to new size
                global_state.realloc(GlobalState::LEN, false)?;
                
                // Add lamports if needed for new size
                let new_lamports_needed = required_lamports.saturating_sub(global_state.lamports());
                if new_lamports_needed > 0 {
                    invoke(
                        &system_instruction::transfer(
                            authority.key,
                            global_state.key,
                            new_lamports_needed,
                        ),
                        &[authority.clone(), global_state.clone(), system_program.clone()],
                    )?;
                }
                
                // Zero-fill new bytes
                let mut data = global_state.try_borrow_mut_data()?;
                for i in current_size..GlobalState::LEN {
                    data[i] = 0;
                }
            } else {
                // If lamports are insufficient, add more
                let new_lamports_needed = required_lamports.saturating_sub(global_state.lamports());
                if new_lamports_needed > 0 {
                    invoke(
                        &system_instruction::transfer(
                            authority.key,
                            global_state.key,
                            new_lamports_needed,
                        ),
                        &[authority.clone(), global_state.clone(), system_program.clone()],
                    )?;
                }
            }
        }

        // Derive vault PDA
        let (vault_pda, vault_bump) = Pubkey::find_program_address(
            &[b"vault"],
            program_id,
        );

        if vault.key != &vault_pda {
            return Err(ProgramError::InvalidArgument);
        }

        // Create vault token account (PDA) if it doesn't exist
        if vault.lamports() == 0 {
            let vault_lamports = rent.minimum_balance(TOKEN_ACCOUNT_SIZE);
            invoke_signed(
                &system_instruction::create_account(
                    authority.key,
                    vault.key,
                    vault_lamports,
                    TOKEN_ACCOUNT_SIZE as u64,
                    token_program.key,
                ),
                &[authority.clone(), vault.clone(), system_program.clone()],
                &[&[b"vault", &[vault_bump]]],
            )?;

            // Initialize vault token account with global_state as authority
            // Token instruction: initialize_account (discriminator: 1)
            let mut init_account_data = vec![1u8]; // initialize_account discriminator
            init_account_data.extend_from_slice(&global_state_pda.to_bytes());
            
            invoke_signed(
                &Instruction {
                    program_id: *token_program.key,
                    accounts: vec![
                        AccountMeta::new(*vault.key, false),
                        AccountMeta::new_readonly(*usdc_mint.key, false),
                        AccountMeta::new_readonly(global_state_pda, false),
                        AccountMeta::new_readonly(Pubkey::from_str(SYSTEM_RENT_ID).unwrap(), false),
                    ],
                    data: init_account_data,
                },
                &[vault.clone(), usdc_mint.clone(), global_state.clone(), rent_sysvar.clone()],
                &[&[b"vault", &[vault_bump]]],
            )?;
        }

        // Initialize GlobalState (or update if reallocated)
        let state = GlobalState {
            authority: *authority.key,
            usdc_mint: *usdc_mint.key,
            vault: vault_pda,
            min_deposit_usd,
            threshold_usd,
            current_epoch: 1,
            epoch_start: clock.unix_timestamp,
            epoch_duration: epoch_duration_secs,
            merkle_root: [0; 32],
            total_payout: 0,
            fee_taken_epoch: u64::MAX,
            carryover_epoch: u64::MAX,
            is_vault_locked: false,
            locked_until: 0,
            bump: global_state_bump,
        };

        state.serialize(&mut &mut global_state.try_borrow_mut_data()?[..])?;

        msg!("Initialize: Program initialized successfully with epoch duration: {} seconds", epoch_duration_secs);
        Ok(())
    }

    fn process_deposit(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        
        let participant = next_account_info(account_iter)?;
        let participant_registry = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;
        let depositor = next_account_info(account_iter)?;
        let depositor_usdc = next_account_info(account_iter)?;
        let vault = next_account_info(account_iter)?;
        let token_program = next_account_info(account_iter)?;
        let system_program = next_account_info(account_iter)?;
        let _rent_sysvar = next_account_info(account_iter)?;

        // Depositor must be signer
        if !depositor.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        // Load global state
        let mut state = deserialize_global_state(&global_state.data.borrow())?;

        // Check if vault is locked
        let clock = Clock::get()?;
        if state.is_vault_locked && clock.unix_timestamp < state.locked_until {
            return Err(RewardPoolError::VaultLocked.into());
        }

        // Verify vault matches state
        if vault.key != &state.vault {
            return Err(ProgramError::InvalidArgument);
        }

        // Validate amount (fixed entry)
        if amount != state.min_deposit_usd {
            return Err(RewardPoolError::InvalidDepositAmount.into());
        }

        // Get current time
        let clock = Clock::get()?;

        // Derive participant PDA
        let (participant_pda, participant_bump) = Pubkey::find_program_address(
            &[b"participant", depositor.key.as_ref(), &state.current_epoch.to_le_bytes()],
            program_id,
        );

        if participant.key != &participant_pda {
            return Err(ProgramError::InvalidArgument);
        }

        // Derive participant registry PDA
        let (registry_pda, registry_bump) = Pubkey::find_program_address(
            &[b"participant_registry", depositor.key.as_ref()],
            program_id,
        );

        if participant_registry.key != &registry_pda {
            return Err(ProgramError::InvalidArgument);
        }

        // Create participant account if it doesn't exist
        if participant.lamports() == 0 {
            let rent = Rent::get()?;
            let required_lamports = rent.minimum_balance(Participant::LEN);
            
            msg!("Creating participant account, requires: {} lamports", required_lamports);

            invoke_signed(
                &system_instruction::create_account(
                    depositor.key,
                    participant.key,
                    required_lamports,
                    Participant::LEN as u64,
                    program_id,
                ),
                &[depositor.clone(), participant.clone(), system_program.clone()],
                &[&[b"participant", depositor.key.as_ref(), &state.current_epoch.to_le_bytes(), &[participant_bump]]],
            ).map_err(|e| {
                msg!("Failed to create participant account: {:?}", e);
                e
            })?;
            
            msg!("Participant account created successfully");
        }

        // Create participant registry if it doesn't exist
        if participant_registry.lamports() == 0 {
            let rent = Rent::get()?;
            let required_lamports = rent.minimum_balance(ParticipantRegistry::LEN);
            
            msg!("Creating participant registry account, requires: {} lamports", required_lamports);

            invoke_signed(
                &system_instruction::create_account(
                    depositor.key,
                    participant_registry.key,
                    required_lamports,
                    ParticipantRegistry::LEN as u64,
                    program_id,
                ),
                &[depositor.clone(), participant_registry.clone(), system_program.clone()],
                &[&[b"participant_registry", depositor.key.as_ref(), &[registry_bump]]],
            ).map_err(|e| {
                msg!("Failed to create participant registry account: {:?}", e);
                e
            })?;
            
            msg!("Participant registry account created successfully");
        }

        let mut registry_state = ParticipantRegistry::try_from_slice(&participant_registry.data.borrow())
            .unwrap_or(ParticipantRegistry {
                owner: Pubkey::default(),
                active_epoch: u64::MAX,
                last_deposit_time: 0,
                bump: registry_bump,
            });

        if registry_state.owner == Pubkey::default() {
            registry_state.owner = *depositor.key;
            registry_state.active_epoch = u64::MAX;
            registry_state.last_deposit_time = 0;
            registry_state.bump = registry_bump;
        } else if registry_state.owner != *depositor.key {
            return Err(ProgramError::InvalidArgument);
        }

        if registry_state.active_epoch == state.current_epoch {
            return Err(RewardPoolError::AlreadyParticipated.into());
        }

        // Allow carryover participants to deposit into new epoch
        // Previous carryover lock removed - users can deposit to move to new epoch

        // Load or initialize participant state
        let mut participant_state = Participant::try_from_slice(&participant.data.borrow())
            .unwrap_or(Participant {
                owner: Pubkey::default(),
                deposited_usdc: 0,
                eligible: false,
                last_deposit_epoch: state.current_epoch,
                last_deposit_time: clock.unix_timestamp,
                bump: participant_bump,
            });

        if participant_state.owner == Pubkey::default() {
            participant_state.owner = *depositor.key;
            participant_state.deposited_usdc = 0;
            participant_state.eligible = false;
            participant_state.last_deposit_epoch = state.current_epoch;
            participant_state.last_deposit_time = clock.unix_timestamp;
            participant_state.bump = participant_bump;
        }

        if participant_state.deposited_usdc > 0 {
            return Err(RewardPoolError::AlreadyParticipated.into());
        }

        // Update participant state
        participant_state.deposited_usdc = participant_state.deposited_usdc.checked_add(amount)
            .ok_or(RewardPoolError::Overflow)?;
        participant_state.last_deposit_epoch = state.current_epoch;
        participant_state.last_deposit_time = clock.unix_timestamp;
        participant_state.eligible = true;

        registry_state.active_epoch = state.current_epoch;
        registry_state.last_deposit_time = clock.unix_timestamp;

        // Transfer USDC from depositor to vault
        msg!("Starting USDC transfer: {} tokens from {} to {}", amount, depositor_usdc.key, vault.key);
        msg!("Depositor wallet: {}", depositor.key);
        
        let ix = token_instruction::transfer(
            token_program.key,
            depositor_usdc.key,
            vault.key,
            depositor.key,
            &[],
            amount,
        )?;
        invoke(&ix, &[
            depositor_usdc.clone(),
            vault.clone(),
            depositor.clone(),
            token_program.clone(),
        ])?;

        // Save participant state
        participant_state.serialize(&mut &mut participant.try_borrow_mut_data()?[..])?;
        registry_state.serialize(&mut &mut participant_registry.try_borrow_mut_data()?[..])?;

        msg!("Deposit: {} tokens from {}", amount, depositor.key);
        Ok(())
    }

    fn process_finalize_epoch(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        epoch: u64,
        merkle_root: [u8; 32],
        total_payout: u64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        
        let authority = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;

        // Authority must be signer
        if !authority.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let mut state = deserialize_global_state(&global_state.data.borrow())?;

        // Only authority can finalize epoch
        if state.authority != *authority.key {
            return Err(RewardPoolError::Unauthorized.into());
        }

        // Verify epoch matches
        if epoch != state.current_epoch {
            return Err(RewardPoolError::InvalidEpoch.into());
        }

        // Check merkle root is not already finalized
        if state.merkle_root != [0; 32] {
            return Err(RewardPoolError::EpochAlreadyFinalized.into());
        }

        // Update merkle root and payout
        state.merkle_root = merkle_root;
        state.total_payout = total_payout;
        state.carryover_epoch = u64::MAX;

        // Save updated state
        state.serialize(&mut &mut global_state.try_borrow_mut_data()?[..])?;

        msg!("FinalizeEpoch: Epoch {} finalized with payout {}", epoch, total_payout);
        Ok(())
    }

    fn process_claim(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        epoch: u64,
        amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        
        let claimant = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;
        let claim_record = next_account_info(account_iter)?;
        let participant = next_account_info(account_iter)?;
        let claimant_usdc = next_account_info(account_iter)?;
        let vault = next_account_info(account_iter)?;
        let token_program = next_account_info(account_iter)?;
        let system_program = next_account_info(account_iter)?;
        let _rent_sysvar = next_account_info(account_iter)?;

        // Claimant must be signer
        if !claimant.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let state = deserialize_global_state(&global_state.data.borrow())?;

        // Check if vault is locked
        let clock = Clock::get()?;
        if state.is_vault_locked && clock.unix_timestamp < state.locked_until {
            return Err(RewardPoolError::VaultLocked.into());
        }

        // Epoch must be finalized
        if state.merkle_root == [0; 32] {
            return Err(RewardPoolError::EpochNotFinalized.into());
        }

        // Epoch must match
        if epoch != state.current_epoch {
            return Err(RewardPoolError::InvalidEpoch.into());
        }

        // Verify participant eligible (load participant state from epoch)
        let participant_state = Participant::try_from_slice(&participant.data.borrow())?;
        if participant_state.owner != *claimant.key {
            return Err(ProgramError::InvalidArgument);
        }
        if vault.key != &state.vault {
            return Err(ProgramError::InvalidArgument);
        }
        if !participant_state.eligible {
            return Err(RewardPoolError::BelowMinimum.into());
        }

        // Check 24-hour claim lock for last-minute entrants
        let clock = Clock::get()?;
        let epoch_end = state.epoch_start + state.epoch_duration;
        let late_join_cutoff = epoch_end - LATE_JOIN_CLAIM_LOCK_SECS;

        if participant_state.last_deposit_time >= late_join_cutoff {
            let claim_unlock_time = epoch_end + LATE_JOIN_CLAIM_LOCK_SECS;
            if clock.unix_timestamp < claim_unlock_time {
                return Err(RewardPoolError::ClaimLocked.into());
            }
        }

        // Derive claim record PDA
        let (claim_record_pda, claim_record_bump) = Pubkey::find_program_address(
            &[b"claim_record", &epoch.to_le_bytes(), claimant.key.as_ref()],
            program_id,
        );

        if claim_record.key != &claim_record_pda {
            return Err(ProgramError::InvalidArgument);
        }

        // Create claim record if it doesn't exist
        if claim_record.lamports() == 0 {
            let rent = Rent::get()?;
            let required_lamports = rent.minimum_balance(ClaimRecord::LEN);

            invoke_signed(
                &system_instruction::create_account(
                    claimant.key,
                    claim_record.key,
                    required_lamports,
                    ClaimRecord::LEN as u64,
                    program_id,
                ),
                &[claimant.clone(), claim_record.clone(), system_program.clone()],
                &[&[b"claim_record", &epoch.to_le_bytes(), claimant.key.as_ref(), &[claim_record_bump]]],
            )?;
        } else {
            // Existing claim record means already claimed
            return Err(RewardPoolError::AlreadyClaimed.into());
        }

        // Verify merkle proof
        let leaf = Self::compute_leaf(*claimant.key, amount);
        Self::verify_merkle_proof(&leaf, &state.merkle_root, &proof)?;

        // Transfer USDC from vault to claimant
        let ix = token_instruction::transfer(
            token_program.key,
            vault.key,
            claimant_usdc.key,
            global_state.key,
            &[],
            amount,
        )?;
        invoke_signed(&ix, &[
            vault.clone(),
            claimant_usdc.clone(),
            global_state.clone(),
            token_program.clone(),
        ], &[&[b"global_state", &[state.bump]]])?;

        // Record claim
        let claim_record_data = ClaimRecord {
            epoch,
            user: *claimant.key,
            amount_claimed: amount,
            claimed_at: clock.unix_timestamp,
            bump: claim_record_bump,
        };

        claim_record_data.serialize(&mut &mut claim_record.try_borrow_mut_data()?[..])?;

        msg!("Claim: {} tokens claimed by {}", amount, claimant.key);
        Ok(())
    }

    /// Compute leaf hash for merkle tree (user + amount)
    fn compute_leaf(user: Pubkey, amount: u64) -> [u8; 32] {
        use solana_program::keccak;
        
        let mut data = Vec::new();
        data.extend_from_slice(user.as_ref());
        data.extend_from_slice(&amount.to_le_bytes());
        
        let hash = keccak::hash(&data);
        hash.0
    }

    /// Verify merkle proof (simplified - assumes Keccak256 in leaf computation)
    fn verify_merkle_proof(leaf: &[u8; 32], root: &[u8; 32], proof: &[[u8; 32]]) -> ProgramResult {
        use solana_program::keccak;
        
        let mut current = *leaf;

        for &proof_element in proof {
            // Hash with proof element (left or right order - simplified)
            let mut data = Vec::new();
            
            // Simplified: always append in same order (production should use ordered comparison)
            if current < proof_element {
                data.extend_from_slice(&current);
                data.extend_from_slice(&proof_element);
            } else {
                data.extend_from_slice(&proof_element);
                data.extend_from_slice(&current);
            }
            
            let hash = keccak::hash(&data);
            current = hash.0;
        }

        if current == *root {
            Ok(())
        } else {
            Err(RewardPoolError::InvalidProof.into())
        }
    }

    fn process_start_epoch(_program_id: &Pubkey, accounts: &[AccountInfo], epoch_duration_secs: i64) -> ProgramResult {
        let account_iter = &mut accounts.iter();
        
        let authority = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;

        // Authority must be signer
        if !authority.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let mut state = deserialize_global_state(&global_state.data.borrow())?;

        // Only authority can start epoch
        if state.authority != *authority.key {
            return Err(RewardPoolError::Unauthorized.into());
        }

        // Increment epoch
        state.current_epoch = state.current_epoch.checked_add(1)
            .ok_or(RewardPoolError::Overflow)?;

        // Reset merkle root and fee marker for new epoch
        state.merkle_root = [0; 32];
        state.total_payout = 0;
        state.fee_taken_epoch = u64::MAX;
        state.is_vault_locked = false;
        state.locked_until = 0;

        // Get current time
        let clock = Clock::get()?;
        state.epoch_start = clock.unix_timestamp;
        
        // Update epoch duration if provided (allows flexible test/production durations)
        state.epoch_duration = epoch_duration_secs;

        // Save updated state
        state.serialize(&mut &mut global_state.try_borrow_mut_data()?[..])?;

        msg!("StartEpoch: Epoch {} started with duration {} seconds", state.current_epoch, epoch_duration_secs);
        Ok(())
    }

    fn process_distribute_fees(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        epoch: u64,
        dev_amount: u64,
        buyback_amount: u64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();

        let authority = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;
        let vault = next_account_info(account_iter)?;
        let dev_fee_account = next_account_info(account_iter)?;
        let buyback_fee_account = next_account_info(account_iter)?;
        let token_program = next_account_info(account_iter)?;

        if !authority.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let mut state = deserialize_global_state(&global_state.data.borrow())?;

        if state.authority != *authority.key {
            return Err(RewardPoolError::Unauthorized.into());
        }

        if epoch != state.current_epoch {
            return Err(RewardPoolError::InvalidEpoch.into());
        }

        if state.fee_taken_epoch == epoch {
            return Err(RewardPoolError::FeeAlreadyTaken.into());
        }

        if vault.key != &state.vault {
            return Err(ProgramError::InvalidArgument);
        }

        if dev_amount > 0 {
            let ix = token_instruction::transfer(
                token_program.key,
                vault.key,
                dev_fee_account.key,
                global_state.key,
                &[],
                dev_amount,
            )?;
            invoke_signed(&ix, &[
                vault.clone(),
                dev_fee_account.clone(),
                global_state.clone(),
                token_program.clone(),
            ], &[&[b"global_state", &[state.bump]]])?;
        }

        if buyback_amount > 0 {
            let ix = token_instruction::transfer(
                token_program.key,
                vault.key,
                buyback_fee_account.key,
                global_state.key,
                &[],
                buyback_amount,
            )?;
            invoke_signed(&ix, &[
                vault.clone(),
                buyback_fee_account.clone(),
                global_state.clone(),
                token_program.clone(),
            ], &[&[b"global_state", &[state.bump]]])?;
        }

        state.fee_taken_epoch = epoch;
        state.serialize(&mut &mut global_state.try_borrow_mut_data()?[..])?;

        msg!(
            "DistributeFees: epoch {} dev {} buyback {}",
            epoch,
            dev_amount,
            buyback_amount
        );
        Ok(())
    }

    fn process_mark_carryover(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        epoch: u64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();

        let global_state = next_account_info(account_iter)?;
        let authority = next_account_info(account_iter)?;

        if !authority.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let mut state = deserialize_global_state(&global_state.data.borrow())?;

        if state.authority != *authority.key {
            return Err(RewardPoolError::Unauthorized.into());
        }

        // Allow marking current or past epochs as carryover (after they end with <20 participants)
        // The epoch being marked must be less than or equal to current epoch
        if epoch > state.current_epoch {
            return Err(RewardPoolError::InvalidEpoch.into());
        }

        if state.carryover_epoch == epoch {
            return Err(RewardPoolError::CarryoverAlreadySet.into());
        }

        state.carryover_epoch = epoch;
        state.serialize(&mut &mut global_state.try_borrow_mut_data()?[..])?;

        msg!("MarkCarryover: epoch {}", epoch);
        Ok(())
    }

    fn process_admin_refund(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        epoch: u64,
        amount: u64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();

        let authority = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;
        let participant = next_account_info(account_iter)?;
        let participant_registry = next_account_info(account_iter)?;
        let vault = next_account_info(account_iter)?;
        let recipient = next_account_info(account_iter)?;
        let token_program = next_account_info(account_iter)?;

        if !authority.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let mut state = deserialize_global_state(&global_state.data.borrow())?;

        if state.authority != *authority.key {
            return Err(RewardPoolError::Unauthorized.into());
        }

        if epoch != state.current_epoch {
            return Err(RewardPoolError::InvalidEpoch.into());
        }

        if state.carryover_epoch == epoch {
            return Err(RewardPoolError::CarryoverAlreadySet.into());
        }

        if vault.key != &state.vault {
            return Err(ProgramError::InvalidArgument);
        }

        let mut participant_state = Participant::try_from_slice(&participant.data.borrow())?;
        let mut registry_state = ParticipantRegistry::try_from_slice(&participant_registry.data.borrow())?;

        if participant_state.owner != registry_state.owner {
            return Err(ProgramError::InvalidArgument);
        }

        if participant_state.last_deposit_epoch != epoch {
            return Err(RewardPoolError::InvalidEpoch.into());
        }

        let (registry_pda, _) = Pubkey::find_program_address(
            &[b"participant_registry", participant_state.owner.as_ref()],
            _program_id,
        );

        if participant_registry.key != &registry_pda {
            return Err(ProgramError::InvalidArgument);
        }

        let ix = token_instruction::transfer(
            token_program.key,
            vault.key,
            recipient.key,
            global_state.key,
            &[],
            amount,
        )?;
        invoke_signed(
            &ix,
            &[
                vault.clone(),
                recipient.clone(),
                global_state.clone(),
                token_program.clone(),
            ],
            &[&[b"global_state", &[state.bump]]],
        )?;

        participant_state.deposited_usdc = 0;
        participant_state.eligible = false;
        participant_state.serialize(&mut &mut participant.try_borrow_mut_data()?[..])?;

        registry_state.active_epoch = u64::MAX;
        registry_state.serialize(&mut &mut participant_registry.try_borrow_mut_data()?[..])?;

        msg!("AdminRefund: epoch {} amount {}", epoch, amount);
        Ok(())
    }

    fn process_partial_withdraw(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        epoch: u64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();

        let user = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;
        let participant = next_account_info(account_iter)?;
        let participant_registry = next_account_info(account_iter)?;
        let vault = next_account_info(account_iter)?;
        let user_usdc = next_account_info(account_iter)?;
        let token_program = next_account_info(account_iter)?;

        // User must be signer
        if !user.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let state = deserialize_global_state(&global_state.data.borrow())?;

        // Check if vault is locked
        let clock = Clock::get()?;
        if state.is_vault_locked && clock.unix_timestamp < state.locked_until {
            return Err(RewardPoolError::VaultLocked.into());
        }

        // Allow withdraw from carryover epoch
        if state.carryover_epoch == u64::MAX {
            return Err(RewardPoolError::NotInCarryover.into());
        }

        // User must be withdrawing from the carryover epoch
        if epoch != state.carryover_epoch {
            return Err(RewardPoolError::InvalidEpoch.into());
        }

        if vault.key != &state.vault {
            return Err(ProgramError::InvalidArgument);
        }

        // Load participant state
        let mut participant_state = Participant::try_from_slice(&participant.data.borrow())?;
        let mut registry_state = ParticipantRegistry::try_from_slice(&participant_registry.data.borrow())?;

        if participant_state.owner != *user.key {
            return Err(ProgramError::InvalidArgument);
        }

        if participant_state.last_deposit_epoch != epoch {
            return Err(RewardPoolError::InvalidEpoch.into());
        }

        // For carryover withdrawals, skip late entrant lock check
        // The carryover epoch has already ended and users have waited
        // The 24h lock was meant for active rounds, not finalized carryover epochs

        // Calculate 50% refund
        let refund_amount = participant_state.deposited_usdc / 2;

        if refund_amount == 0 {
            return Err(RewardPoolError::InsufficientBalance.into());
        }

        // Transfer 50% back to user
        let ix = token_instruction::transfer(
            token_program.key,
            vault.key,
            user_usdc.key,
            global_state.key,
            &[],
            refund_amount,
        )?;
        invoke_signed(
            &ix,
            &[
                vault.clone(),
                user_usdc.clone(),
                global_state.clone(),
                token_program.clone(),
            ],
            &[&[b"global_state", &[state.bump]]],
        )?;

        // Clear participant: remaining 50% stays in vault, user exits pool
        participant_state.deposited_usdc = 0;
        participant_state.eligible = false;
        participant_state.serialize(&mut &mut participant.try_borrow_mut_data()?[..])?;

        // Registry remains (for potential future re-entry)
        // User has exited pool: 50% refunded, 50% kept in vault

        msg!("PartialWithdraw: epoch {} refund {} vault_kept {}", epoch, refund_amount, refund_amount);
        Ok(())
    }

    fn process_lock_vault(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        duration_secs: i64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();

        let authority = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;

        // Authority must be signer and match account
        if !authority.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let mut state = deserialize_global_state(&global_state.data.borrow())?;

        if authority.key != &state.authority {
            return Err(RewardPoolError::Unauthorized.into());
        }

        // Get current time
        let clock = Clock::get()?;

        // Set vault as locked and calculate unlock time
        state.is_vault_locked = true;
        state.locked_until = clock.unix_timestamp + duration_secs;

        // Serialize state back to account (handle size mismatch)
        let mut account_data = global_state.try_borrow_mut_data()?;
        if account_data.len() < GlobalState::LEN {
            // Account is too small, cannot extend here - need reallocation first
            return Err(ProgramError::AccountDataTooSmall);
        }
        
        state.serialize(&mut &mut account_data[..])?;

        msg!("LockVault: vault locked until timestamp {}", state.locked_until);
        Ok(())
    }

    fn process_reinitialize(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        min_deposit_usd: u64,
        threshold_usd: u64,
    ) -> ProgramResult {
        let account_iter = &mut accounts.iter();

        let authority = next_account_info(account_iter)?;
        let global_state = next_account_info(account_iter)?;

        // Authority must be signer
        if !authority.is_signer {
            return Err(RewardPoolError::Unauthorized.into());
        }

        let mut state = deserialize_global_state(&global_state.data.borrow())?;

        if authority.key != &state.authority {
            return Err(RewardPoolError::Unauthorized.into());
        }

        // Reinitialize with new values, preserving vault and bump
        let clock = Clock::get()?;
        state.min_deposit_usd = min_deposit_usd;
        state.threshold_usd = threshold_usd;
        state.epoch_start = clock.unix_timestamp;
        state.current_epoch = 1;
        state.is_vault_locked = false;
        state.locked_until = 0;
        state.merkle_root = [0; 32];
        state.total_payout = 0;
        state.fee_taken_epoch = u64::MAX;
        state.carryover_epoch = u64::MAX;

        // Serialize state back to account (handle size mismatch)
        let mut account_data = global_state.try_borrow_mut_data()?;
        if account_data.len() < GlobalState::LEN {
            // Account is too small, cannot extend here - need reallocation first
            return Err(ProgramError::AccountDataTooSmall);
        }
        
        state.serialize(&mut &mut account_data[..])?;

        msg!("ReInitialize: GlobalState reinitialized successfully");
        Ok(())
    }

}
