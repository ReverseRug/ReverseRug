// Utility functions for Solana transactions
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Rent,
} from '@solana/web3.js';
import { 
  TOKEN_2022_PROGRAM_ID, 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import { Buffer } from 'buffer';

const getProgramId = (): PublicKey => {
  const programIdString = import.meta.env.VITE_PROGRAM_ID as string | undefined;
  if (!programIdString) {
    throw new Error('Missing VITE_PROGRAM_ID in .env');
  }
  return new PublicKey(programIdString);
};

const getUsdcMint = (): PublicKey => {
  const mintString = (import.meta.env.VITE_USDC_MINT as string | undefined)
    || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  return new PublicKey(mintString);
};

export interface DepositParams {
  connection: Connection;
  userPublicKey: PublicKey;
  amount: number; // In USDC (e.g., 100 for $100)
}

export interface ClaimParams {
  connection: Connection;
  userPublicKey: PublicKey;
  epoch: bigint;
  amount: bigint; // USDC base units
  proof: string[]; // hex strings
}

export const createDepositTransaction = async ({
  connection,
  userPublicKey,
  amount,
}: DepositParams): Promise<Transaction> => {
  const programId = getProgramId();
  const usdcMint = getUsdcMint();

  console.log('🔹 Creating deposit transaction for:', amount, 'USDC');
  console.log('🔹 User wallet:', userPublicKey.toBase58());
  console.log('🔹 Program ID:', programId.toBase58());
  
  // Convert amount to lamports (USDC has 6 decimals)
  const amountLamports = BigInt(Math.floor(amount * 1e6));
  console.log('🔹 Amount in lamports:', amountLamports.toString());
  
  // Get GlobalState PDA
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );
  console.log('🔹 GlobalState PDA:', globalStatePda.toBase58());
  
  // Fetch global state to get current epoch
  console.log('🔹 Fetching global state account...');
  const globalStateAccount = await connection.getAccountInfo(globalStatePda);
  if (!globalStateAccount) {
    console.error('❌ Global state account not found at:', globalStatePda.toBase58());
    throw new Error(`Global state not found. Program may not be deployed at ${programId.toBase58()}`);
  }
  console.log('✅ Global state found, data length:', globalStateAccount.data.length);

  const usdcMintFromState = new PublicKey(globalStateAccount.data.slice(32, 64));
  console.log('🔹 USDC mint from config:', usdcMint.toBase58());
  console.log('🔹 USDC mint from state:', usdcMintFromState.toBase58());
  
  if (!usdcMintFromState.equals(usdcMint)) {
    console.warn('⚠️ USDC mint MISMATCH! Using state mint:', usdcMintFromState.toBase58());
  }

  const mintAccountInfo = await connection.getAccountInfo(usdcMintFromState);
  if (!mintAccountInfo) {
    throw new Error(`USDC mint account not found: ${usdcMintFromState.toBase58()}`);
  }

  const tokenProgramId = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
  
  // Parse currentEpoch from global state (offset 112 bytes)
  const currentEpoch = globalStateAccount.data.readBigUInt64LE(112);
  
  // Get Participant PDA
  const toU64Le = (value: bigint): Buffer => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
  };
  
  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), userPublicKey.toBuffer(), toU64Le(currentEpoch)],
    programId
  );
  
  // Get ParticipantRegistry PDA
  const [participantRegistryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant_registry'), userPublicKey.toBuffer()],
    programId
  );
  
  // Check wallet SOL balance and required fees
  console.log('🔹 Checking wallet SOL balance...');
  const walletInfo = await connection.getAccountInfo(userPublicKey);
  const walletBalance = walletInfo?.lamports || 0;
  console.log('💰 Wallet SOL balance:', (walletBalance / 1e9).toFixed(6), 'SOL');
  
  // Calculate required lamports for transaction
  // - Each PDA creation: ~11,000 lamports (rent for 200+ bytes)
  // - Transaction fee: ~5,000 lamports
  // - Signature verification buffer: ~5,000 lamports
  const PARTICIPANT_PDA_RENT = 11000; // approx
  const REGISTRY_PDA_RENT = 11000;    // approx  
  const TX_FEE = 15000; // buffer for fees + prioritization
  const USDC_ATA_RENT = 2000; // if needs to be created
  
  const requiredLamports = PARTICIPANT_PDA_RENT + REGISTRY_PDA_RENT + TX_FEE + USDC_ATA_RENT;
  const requiredSOL = (requiredLamports / 1e9).toFixed(6);
  
  console.log('💡 Required for transaction:', requiredSOL, 'SOL (~', requiredLamports, 'lamports)');
  
  if (walletBalance < requiredLamports) {
    throw new Error(
      `⚠️ Insufficient SOL balance. You need at least ${requiredSOL} SOL for this transaction. ` +
      `Current balance: ${(walletBalance / 1e9).toFixed(6)} SOL. ` +
      `Missing: ${((requiredLamports - walletBalance) / 1e9).toFixed(6)} SOL`
    );
  }
  
  // Get user's USDC token account
  console.log('🔹 Getting user USDC token account...');
  const userUsdcAccount = await getAssociatedTokenAddress(
    usdcMintFromState,
    userPublicKey,
    false,
    tokenProgramId
  );
  console.log('🔹 User USDC account:', userUsdcAccount.toBase58());
  
  // Check and prepare transaction
  const transaction = new Transaction();
  transaction.feePayer = userPublicKey;
  
  const userUsdcAccountInfo = await connection.getAccountInfo(userUsdcAccount);
  if (!userUsdcAccountInfo) {
    console.log('⚠️  USDC token account does not exist for mint:', usdcMintFromState.toBase58());
    console.log('   Calculated ATA:', userUsdcAccount.toBase58());
    console.log('   Will create new token account...');
    
    // Add instruction to create associated token account if it doesn't exist
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      userPublicKey,     // payer
      userUsdcAccount,   // ata
      userPublicKey,     // owner
      usdcMintFromState, // mint
      tokenProgramId     // tokenProgram
    );
    transaction.add(createAtaIx);
    console.log('✅ Will create USDC token account');
  } else {
    console.log('✅ User USDC account exists at:', userUsdcAccount.toBase58());
    
    // Check USDC balance
    const tokenData = userUsdcAccountInfo.data;
    console.log('   Account data length:', tokenData.length);
    
    // Verify account mint (bytes 0-32)
    const accountMint = new PublicKey(tokenData.slice(0, 32));
    console.log('   Account mint:', accountMint.toBase58());
    console.log('   Expected mint:', usdcMintFromState.toBase58());
    
    if (!accountMint.equals(usdcMintFromState)) {
      console.error('❌ MINT MISMATCH! Account is for different token');
      throw new Error(
        `Token account mismatch. Account is for ${accountMint.toBase58()} ` +
        `but we need ${usdcMintFromState.toBase58()}`
      );
    }
    
    // Read balance (bytes 64-72, u64 LE)
    if (tokenData.length >= 72) {
      const balanceLamports = tokenData.readBigUInt64LE(64);
      console.log('   Balance (raw):', balanceLamports.toString(), 'lamports');
      console.log('💰 USDC balance:', (Number(balanceLamports) / 1e6).toFixed(2), 'USDC');
      
      if (balanceLamports < amountLamports) {
        throw new Error(
          `Insufficient USDC balance. You have ${(Number(balanceLamports) / 1e6).toFixed(2)} USDC ` +
          `but trying to deposit ${(Number(amountLamports) / 1e6).toFixed(2)} USDC`
        );
      }
    }
  }
  
  // Get vault USDC account (read from global state)
  const vaultPublicKey = new PublicKey(globalStateAccount.data.slice(64, 96));
  console.log('🔹 Vault account:', vaultPublicKey.toBase58());
  
  // Create deposit instruction
  console.log('🔹 Building deposit instruction...');
  const depositIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: participantPda, isSigner: false, isWritable: true },
      { pubkey: participantRegistryPda, isSigner: false, isWritable: true },
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: userUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: vaultPublicKey, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([1]), // Instruction discriminator for "deposit"
      toU64Le(amountLamports),
    ]),
  });
  console.log('✅ Deposit instruction created');
  transaction.add(depositIx);
  
  console.log('🔹 Getting latest blockhash...');
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  console.log('✅ Transaction ready to send');
  return transaction;
};

export const confirmTransaction = async (
  connection: Connection,
  signature: string
): Promise<boolean> => {
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  return !confirmation.value.err;
};

export const createClaimTransaction = async ({
  connection,
  userPublicKey,
  epoch,
  amount,
  proof,
}: ClaimParams): Promise<Transaction> => {
  const programId = getProgramId();

  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );

  const globalStateAccount = await connection.getAccountInfo(globalStatePda);
  if (!globalStateAccount) {
    throw new Error('Global state not found');
  }

  const usdcMintFromState = new PublicKey(globalStateAccount.data.slice(32, 64));
  const mintAccountInfo = await connection.getAccountInfo(usdcMintFromState);
  if (!mintAccountInfo) {
    throw new Error(`USDC mint account not found: ${usdcMintFromState.toBase58()}`);
  }

  const tokenProgramId = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  const toU64Le = (value: bigint): Buffer => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
  };

  const toBytes = (hex: string): Uint8Array => {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    return new Uint8Array(Buffer.from(clean, 'hex'));
  };

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), userPublicKey.toBuffer(), toU64Le(epoch)],
    programId
  );

  const [claimRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('claim_record'), toU64Le(epoch), userPublicKey.toBuffer()],
    programId
  );

  const userUsdcAccount = await getAssociatedTokenAddress(
    usdcMintFromState,
    userPublicKey,
    false,
    tokenProgramId
  );

  const transaction = new Transaction();
  transaction.feePayer = userPublicKey;

  const [userInfo, userUsdcInfo, claimRecordInfo] = await Promise.all([
    connection.getAccountInfo(userPublicKey),
    connection.getAccountInfo(userUsdcAccount),
    connection.getAccountInfo(claimRecordPda),
  ]);

  if (!userUsdcInfo) {
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      userPublicKey,
      userUsdcAccount,
      userPublicKey,
      usdcMintFromState,
      tokenProgramId
    );
    transaction.add(createAtaIx);
  }

  const walletBalance = userInfo?.lamports ?? 0;
  const claimRecordRent = claimRecordInfo
    ? 0
    : await connection.getMinimumBalanceForRentExemption(57);
  const ataRent = userUsdcInfo
    ? 0
    : await connection.getMinimumBalanceForRentExemption(165);
  const feeBuffer = 15000;
  const requiredLamports = claimRecordRent + ataRent + feeBuffer;

  if (walletBalance < requiredLamports) {
    throw new Error(
      `⚠️ Insufficient SOL balance. Need at least ${(requiredLamports / 1e9).toFixed(6)} SOL ` +
      `for claim rent+fees. Current: ${(walletBalance / 1e9).toFixed(6)} SOL`
    );
  }

  const vaultPublicKey = new PublicKey(globalStateAccount.data.slice(64, 96));

  const proofBytes = proof.map(toBytes);

  const instructionData = Buffer.alloc(1 + 8 + 8 + 4 + proofBytes.length * 32);
  let offset = 0;
  instructionData[offset] = 3; // Claim
  offset += 1;
  instructionData.writeBigUInt64LE(epoch, offset);
  offset += 8;
  instructionData.writeBigUInt64LE(amount, offset);
  offset += 8;
  instructionData.writeUInt32LE(proofBytes.length, offset);
  offset += 4;
  for (const node of proofBytes) {
    instructionData.set(node, offset);
    offset += 32;
  }

  const claimIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: userPublicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: false },
      { pubkey: claimRecordPda, isSigner: false, isWritable: true },
      { pubkey: participantPda, isSigner: false, isWritable: false },
      { pubkey: userUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: vaultPublicKey, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: instructionData.slice(0, offset),
  });
  transaction.add(claimIx);

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  return transaction;
};

export interface PartialWithdrawParams {
  connection: Connection;
  userPublicKey: PublicKey;
  carryoverEpoch?: bigint | number | string;
}

export const createPartialWithdrawTransaction = async ({
  connection,
  userPublicKey,
  carryoverEpoch,
}: PartialWithdrawParams): Promise<Transaction> => {
  const programId = getProgramId();

  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );

  const globalStateAccount = await connection.getAccountInfo(globalStatePda);
  if (!globalStateAccount) {
    throw new Error('Global state not found');
  }

  const usdcMintFromState = new PublicKey(globalStateAccount.data.slice(32, 64));
  const mintAccountInfo = await connection.getAccountInfo(usdcMintFromState);
  if (!mintAccountInfo) {
    throw new Error(`USDC mint account not found: ${usdcMintFromState.toBase58()}`);
  }

  const tokenProgramId = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  const currentEpoch = globalStateAccount.data.readBigUInt64LE(112);
  const epochToWithdraw = carryoverEpoch !== undefined
    ? BigInt(carryoverEpoch)
    : currentEpoch;

  const toU64Le = (value: bigint): Buffer => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
  };

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), userPublicKey.toBuffer(), toU64Le(epochToWithdraw)],
    programId
  );

  const [participantRegistryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant_registry'), userPublicKey.toBuffer()],
    programId
  );

  const userUsdcAccount = await getAssociatedTokenAddress(
    usdcMintFromState,
    userPublicKey,
    false,
    tokenProgramId
  );

  const vaultPublicKey = new PublicKey(globalStateAccount.data.slice(64, 96));

  const withdrawIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: userPublicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: false },
      { pubkey: participantPda, isSigner: false, isWritable: true },
      { pubkey: participantRegistryPda, isSigner: false, isWritable: true },
      { pubkey: vaultPublicKey, isSigner: false, isWritable: true },
      { pubkey: userUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([8]),
      toU64Le(epochToWithdraw),
    ]),
  });

  const transaction = new Transaction().add(withdrawIx);
  transaction.feePayer = userPublicKey;

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  return transaction;
};

// Check if user has already participated in the current epoch
export const checkParticipantStatus = async (
  connection: Connection,
  userPublicKey: PublicKey
): Promise<{ hasDeposited: boolean; currentEpoch: bigint; lastDepositTime: number }> => {
  try {
    const programId = getProgramId();

    // Get GlobalState PDA to find current epoch
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      programId
    );

    const globalStateAccount = await connection.getAccountInfo(globalStatePda);
    if (!globalStateAccount) {
      throw new Error('Global state account not found');
    }

    const currentEpoch = globalStateAccount.data.readBigUInt64LE(112);
    const epochStart = Number(globalStateAccount.data.readBigInt64LE(120));

    // Get ParticipantRegistry PDA
    const [participantRegistryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('participant_registry'), userPublicKey.toBuffer()],
      programId
    );

    const registryAccount = await connection.getAccountInfo(participantRegistryPda);
    
    if (!registryAccount || registryAccount.data.length === 0) {
      // Account doesn't exist yet
      return {
        hasDeposited: false,
        currentEpoch,
        lastDepositTime: 0,
      };
    }

    // Parse registry data
    // Structure: owner (32) + active_epoch (8) + last_deposit_time (8) + bump (1)
    const activeEpoch = registryAccount.data.readBigUInt64LE(32);
    const lastDepositTime = registryAccount.data.readBigInt64LE(40);

    const hasDeposited = activeEpoch === currentEpoch && Number(lastDepositTime) >= epochStart;

    return {
      hasDeposited,
      currentEpoch,
      lastDepositTime: Number(lastDepositTime),
    };
  } catch (error) {
    console.error('Error checking participant status:', error);
    return {
      hasDeposited: false,
      currentEpoch: BigInt(0),
      lastDepositTime: 0,
    };
  }
};
