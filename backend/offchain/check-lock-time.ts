import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = '2T9Vs1DjHd9oqtzT8oTaRqrtThBDdHJKSZuvWvRFf6np';
const connection = new Connection('https://api.devnet.solana.com');
const programId = new PublicKey(PROGRAM_ID);

async function main() {
  // Get global state
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );

  const globalStateAccount = await connection.getAccountInfo(globalStatePda);
  if (!globalStateAccount) {
    throw new Error('Global state not found');
  }

  const currentEpoch = globalStateAccount.data.readBigUInt64LE(112);
  const carryoverEpoch = globalStateAccount.data.readBigUInt64LE(184);
  
  console.log('Current Epoch:', currentEpoch.toString());
  console.log('Carryover Epoch:', carryoverEpoch.toString());
  console.log('');

  // Get carryover epoch details
  const toU64Le = (value: number) => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
  };

  const [epochInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('epoch_info'), toU64Le(Number(carryoverEpoch))],
    programId
  );

  console.log('Checking Epoch', carryoverEpoch.toString(), 'info...');
  const epochInfoAccount = await connection.getAccountInfo(epochInfoPda);
  
  if (epochInfoAccount) {
    const epochStart = epochInfoAccount.data.readBigInt64LE(8);
    const epochDuration = epochInfoAccount.data.readBigUInt64LE(16);
    const epochEnd = epochStart + epochDuration;
    const lateJoinCutoff = epochEnd - BigInt(24 * 60 * 60);
    const refundUnlockTime = epochEnd + BigInt(24 * 60 * 60);
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log('Epoch Start:', new Date(Number(epochStart) * 1000).toISOString());
    console.log('Epoch Duration:', Number(epochDuration), 'seconds');
    console.log('Epoch End:', new Date(Number(epochEnd) * 1000).toISOString());
    console.log('Late Join Cutoff:', new Date(Number(lateJoinCutoff) * 1000).toISOString());
    console.log('Refund Unlock Time:', new Date(Number(refundUnlockTime) * 1000).toISOString());
    console.log('');
    console.log('Current Time:', new Date(currentTime * 1000).toISOString());
    console.log('');
    
    if (currentTime >= Number(refundUnlockTime)) {
      console.log('✅ Lock has expired! Withdraw should work.');
    } else {
      console.log('❌ Lock still active. Need to wait until:', new Date(Number(refundUnlockTime) * 1000).toISOString());
      const waitSeconds = Number(refundUnlockTime) - currentTime;
      console.log('   Wait time:', Math.floor(waitSeconds / 60), 'minutes');
    }
    
    // Check participant deposit time
    console.log('');
    console.log('Participant deposit time from API: 1771651747');
    const depositTime = 1771651747;
    console.log('Deposit timestamp:', new Date(depositTime * 1000).toISOString());
    
    if (depositTime >= Number(lateJoinCutoff)) {
      console.log('⚠️  User deposited after late join cutoff - 24h lock applies');
    } else {
      console.log('✓ User deposited before late join cutoff - no lock');
    }
  } else {
    console.log('✗ Epoch info account not found');
  }
}

main().catch(console.error);
