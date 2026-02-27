import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.devnet' });

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!);
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const TARGET_WALLET = process.env.TARGET_WALLET;
const ADMIN_KEYPAIR_PATH = process.env.ADMIN_KEYPAIR_PATH || process.env.CRON_KEYPAIR;

if (!TARGET_WALLET) {
  throw new Error('Missing TARGET_WALLET environment variable');
}
if (!ADMIN_KEYPAIR_PATH) {
  throw new Error('Missing ADMIN_KEYPAIR_PATH or CRON_KEYPAIR environment variable');
}

const connection = new Connection(RPC_URL, 'confirmed');
const userWallet = new PublicKey(TARGET_WALLET);
const adminSecretKey = JSON.parse(fs.readFileSync(ADMIN_KEYPAIR_PATH, 'utf-8'));
const admin = Keypair.fromSecretKey(new Uint8Array(adminSecretKey));

async function main() {
  try {
    console.log('=== Inspect ParticipantRegistry ===');
    console.log('Program ID:', PROGRAM_ID.toString());
    console.log('Target Wallet:', userWallet.toString());
    console.log('Admin:', admin.publicKey.toString());

    const [registryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('participant_registry'), userWallet.toBuffer()],
      PROGRAM_ID
    );

    console.log('\nParticipantRegistry PDA:', registryPda.toString());

    const accountInfo = await connection.getAccountInfo(registryPda);
    if (!accountInfo) {
      console.log('Account does not exist; nothing to reset.');
      process.exit(0);
    }

    console.log('Account size:', accountInfo.executable ? 'Program' : accountInfo.data.length, 'bytes');
    console.log('Account owner:', accountInfo.owner.toString());

    if (accountInfo.owner.toString() !== PROGRAM_ID.toString()) {
      console.log('Account is not owned by the configured program; cannot reset.');
      process.exit(1);
    }

    console.log('\nAccount state snapshot:');
    const data = accountInfo.data;
    if (data.length >= 40) {
      const owner = data.subarray(0, 32);
      const activeEpoch = data.readBigUInt64LE(32);
      console.log('  Owner:', new PublicKey(owner).toString());
      console.log('  Active Epoch:', activeEpoch.toString());
      if (data.length >= 48) {
        console.log('  Last Deposit Time:', data.readBigInt64LE(40).toString());
      }
      if (data.length > 48) {
        console.log('  Bump:', data[48]);
      }
    }

    console.log('\nNo reset instruction is executed by this script.');
    console.log('To reset state, add and invoke a dedicated admin instruction in the on-chain program.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
