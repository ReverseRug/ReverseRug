import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } from '@solana/web3.js';
import fs from 'fs';

const PROGRAM_ID = '2T9Vs1DjHd9oqtzT8oTaRqrtThBDdHJKSZuvWvRFf6np';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const programId = new PublicKey(PROGRAM_ID);

async function setCarryover(epochNumber: number) {
  // Load authority keypair
  const authorityKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('/root/.config/solana/id.json', 'utf-8')))
  );
  
  console.log('Setting carryover for Epoch', epochNumber);
  console.log('Authority:', authorityKeypair.publicKey.toString());
  
  // Get GlobalState PDA
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_state')],
    programId
  );
  
  // Create SetCarryover instruction
  const toU64Le = (value: number) => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
  };
  
  const setCarryoverIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: globalStatePda, isSigner: false, isWritable: true },
      { pubkey: authorityKeypair.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([5]), // MarkCarryover instruction (index 5)
      toU64Le(epochNumber),
    ]),
  });
  
  const transaction = new Transaction().add(setCarryoverIx);
  transaction.feePayer = authorityKeypair.publicKey;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  console.log('Sending SetCarryover transaction...');
  const signature = await connection.sendTransaction(transaction, [authorityKeypair]);
  console.log('Transaction:', signature);
  
  await connection.confirmTransaction(signature, 'confirmed');
  console.log('✓ Carryover set for epoch', epochNumber);
}

const epoch = parseInt(process.argv[2] || '12');
setCarryover(epoch).catch(console.error);
