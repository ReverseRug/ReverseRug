import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const programId = new PublicKey(process.env.PROGRAM_ID || process.argv[2] || '11111111111111111111111111111111');
const userPublicKey = new PublicKey(process.env.USER_WALLET || process.argv[3] || '11111111111111111111111111111111');
const epochToWithdraw = Number(process.env.EPOCH || process.argv[4] || '1');
const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

if (programId.toBase58() === '11111111111111111111111111111111' || userPublicKey.toBase58() === '11111111111111111111111111111111') {
  throw new Error('Set PROGRAM_ID and USER_WALLET via env or CLI args');
}

const connection = new Connection(rpcUrl);

const toU64Le = (value: number) => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
};

async function main() {
  const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], programId);

  const globalStateAccount = await connection.getAccountInfo(globalStatePda);
  if (!globalStateAccount) throw new Error('Global state not found');

  const usdcMint = new PublicKey(globalStateAccount.data.slice(32, 64));
  const vault = new PublicKey(globalStateAccount.data.slice(64, 96));

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), userPublicKey.toBuffer(), toU64Le(epochToWithdraw)],
    programId
  );

  const [participantRegistryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant_registry'), userPublicKey.toBuffer()],
    programId
  );

  const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, userPublicKey, false, TOKEN_PROGRAM_ID);

  const withdrawIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: userPublicKey, isSigner: true, isWritable: false },
      { pubkey: globalStatePda, isSigner: false, isWritable: false },
      { pubkey: participantPda, isSigner: false, isWritable: true },
      { pubkey: participantRegistryPda, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: userUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([8]), toU64Le(epochToWithdraw)]),
  });

  const transaction = new Transaction().add(withdrawIx);
  transaction.feePayer = userPublicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  console.log('Simulating partial-withdraw transaction...');
  const simulation = await connection.simulateTransaction(transaction);

  if (simulation.value.err) {
    console.log('Simulation failed:');
    console.log(JSON.stringify(simulation.value.err, null, 2));
  } else {
    console.log('Simulation successful.');
  }

  if (simulation.value.logs) {
    console.log('Program logs:');
    simulation.value.logs.forEach((log) => console.log('  ', log));
  }
}

main().catch(console.error);
