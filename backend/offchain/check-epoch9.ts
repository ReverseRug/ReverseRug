import { Connection, PublicKey } from '@solana/web3.js';

const conn = new Connection('https://api.devnet.solana.com');
const programId = new PublicKey('2T9Vs1DjHd9oqtzT8oTaRqrtThBDdHJKSZuvWvRFf6np');
const wallet = new PublicKey('J3KGwg1iNxp9VFdaZt51i2kADXmxRXA98ytywtpys6F7');

async function check() {
  // Epoch 9 PDA
  const [pda9] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), wallet.toBuffer(), Buffer.from([9])],
    programId
  );

  const acc = await conn.getAccountInfo(pda9);
  console.log('Epoch 9 PDA:', pda9.toString());
  console.log('Exists:', acc !== null);
  if (acc) console.log('Balance:', acc.lamports, 'lamports');
}

check();
