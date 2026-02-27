import { Connection, PublicKey } from '@solana/web3.js';

const programId = new PublicKey(process.env.PROGRAM_ID || process.argv[2] || '11111111111111111111111111111111');
const wallet = new PublicKey(process.env.WALLET || process.argv[3] || '11111111111111111111111111111111');
const epoch = Number(process.env.EPOCH || process.argv[4] || '1');
const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

const connection = new Connection(rpcUrl);

const toU64Le = (value: number) => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
};

async function main() {
  if (programId.toBase58() === '11111111111111111111111111111111' || wallet.toBase58() === '11111111111111111111111111111111') {
    throw new Error('Set PROGRAM_ID and WALLET via env or CLI args');
  }

  const [participantPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('participant'), wallet.toBuffer(), toU64Le(epoch)],
    programId
  );

  console.log(`Checking Participant PDA for epoch ${epoch}`);
  console.log('Wallet:', wallet.toString());
  console.log('PDA:', participantPda.toString());
  console.log('');

  const account = await connection.getAccountInfo(participantPda);
  if (!account) {
    console.log('Account does not exist');
    return;
  }

  console.log('Account exists');
  console.log('  Data length:', account.data.length);
  console.log('  Owner:', account.owner.toString());
  console.log('  Lamports:', account.lamports);
  console.log('');

  if (account.data.length >= 56) {
    const depositedUsdc = account.data.readBigUInt64LE(32);
    const lastDepositEpoch = account.data.readBigUInt64LE(40);
    const lastDepositTime = account.data.readBigInt64LE(48);

    console.log('Participant data (raw offsets):');
    console.log('  Deposited USDC:', depositedUsdc.toString(), '(', Number(depositedUsdc) / 1_000_000, 'USDC)');
    console.log('  Last Deposit Epoch:', lastDepositEpoch.toString());
    console.log('  Last Deposit Time:', lastDepositTime.toString());
  }
}

main().catch(console.error);
