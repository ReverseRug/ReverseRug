import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const PROGRAM_ID = '2T9Vs1DjHd9oqtzT8oTaRqrtThBDdHJKSZuvWvRFf6np';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const programId = new PublicKey(PROGRAM_ID);

interface Winner {
  epoch: number;
  winner: string;
  prize: number; // in USDC (with 6 decimals)
  participants: number;
  timestamp: number;
  txSignature?: string;
}

async function selectWinner(epochNumber: number) {
  console.log('\n🎲 Selecting winner for Epoch', epochNumber);
  
  // Get all participants from epoch
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );
  
  const globalState = await connection.getAccountInfo(globalStatePda);
  if (!globalState) {
    throw new Error('Global state not found');
  }
  
  // Get total pool amount (simplified - assumes 100 USDC per participant)
  // In production, you'd fetch actual deposited amounts
  
  // For testing, randomly select a participant
  const participantCount = 20; // From test
  const winnerIndex = Math.floor(Math.random() * participantCount) + 1;
  
  console.log('  Participants:', participantCount);
  console.log('  Winner index:', winnerIndex);
  
  // Load participant wallet (from keys folder)
  const participantPath = path.join(process.cwd(), '../../keys/participants', `p${winnerIndex}.json`);
  const participantKeypair = JSON.parse(fs.readFileSync(participantPath, 'utf-8'));
  const winnerPubkey = PublicKey.createWithSeed(
    PublicKey.unique(),
    'participant',
    programId
  );
  
  // Calculate prize (90% of pool, 10% is fee)
  const totalPool = participantCount * 100_000_000; // 100 USDC per participant (6 decimals)
  const prize = Math.floor(totalPool * 0.9); // 90% to winner
  
  const winner: Winner = {
    epoch: epochNumber,
    winner: `p${winnerIndex}.json`, // For testing, store the file reference
    prize: prize,
    participants: participantCount,
    timestamp: Math.floor(Date.now() / 1000),
  };
  
  console.log('  Winner:', winner.winner);
  console.log('  Prize:', prize / 1_000_000, 'USDC');
  console.log('  Total Pool:', totalPool / 1_000_000, 'USDC');
  
  // Save to winners.json
  const winnersPath = path.join(process.cwd(), 'winners.json');
  let winners: Winner[] = [];
  
  if (fs.existsSync(winnersPath)) {
    winners = JSON.parse(fs.readFileSync(winnersPath, 'utf-8'));
  }
  
  winners.push(winner);
  fs.writeFileSync(winnersPath, JSON.stringify(winners, null, 2));
  
  console.log('✅ Winner recorded to winners.json');
  console.log('');
  
  return winner;
}

const epoch = parseInt(process.argv[2] || '15');
selectWinner(epoch).catch(console.error);
