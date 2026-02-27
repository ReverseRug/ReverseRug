import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";
import { RewardPool } from "../target/types/reward_pool";

describe("reward-pool", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RewardPool as Program<RewardPool>;
  const authority = provider.wallet as anchor.Wallet;

  let usdcMint: PublicKey;
  let globalState: PublicKey;
  let vault: PublicKey;
  let userTokenAccount: PublicKey;

  const MIN_DEPOSIT = 100_000_000; // $100 (6 decimals)
  const THRESHOLD = 1000_000_000; // $1000

  before(async () => {
    // Create USDC mint
    usdcMint = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6
    );

    // Derive PDAs
    [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      program.programId
    );

    [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    // Create user token account and mint tokens
    const userTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority.payer,
      usdcMint,
      authority.publicKey
    );
    userTokenAccount = userTokenAccountInfo.address;

    await mintTo(
      provider.connection,
      authority.payer,
      usdcMint,
      userTokenAccount,
      authority.payer,
      10_000_000_000 // 10,000 USDC
    );
  });

  it("Initializes the pool", async () => {
    await program.methods
      .initialize(usdcMint, new anchor.BN(MIN_DEPOSIT), new anchor.BN(THRESHOLD))
      .accounts({
        globalState,
        vault,
        usdcMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const state = await program.account.globalState.fetch(globalState);
    assert.equal(state.authority.toString(), authority.publicKey.toString());
    assert.equal(state.minDepositUsd.toNumber(), MIN_DEPOSIT);
    assert.equal(state.thresholdUsd.toNumber(), THRESHOLD);
    assert.equal(state.currentEpoch.toNumber(), 0);
  });

  it("Deposits USDC", async () => {
    const epochBytes = new anchor.BN(0).toArrayLike(Buffer, "le", 8);
    const [participant] = PublicKey.findProgramAddressSync(
      [Buffer.from("participant"), authority.publicKey.toBuffer(), epochBytes],
      program.programId
    );

    const depositAmount = 100_000_000; // $100

    await program.methods
      .deposit(new anchor.BN(depositAmount))
      .accounts({
        globalState,
        participant,
        vault,
        userTokenAccount,
        user: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const participantData = await program.account.participant.fetch(participant);
    assert.equal(participantData.depositedUsdc.toNumber(), depositAmount);
    assert.isTrue(participantData.eligible);
  });

  it("Finalizes epoch with merkle root", async () => {
    const epoch = 1;
    const merkleRoot = Array(32).fill(1);
    const totalPayout = 500_000_000;

    await program.methods
      .finalizeEpoch(
        new anchor.BN(epoch),
        merkleRoot,
        new anchor.BN(totalPayout)
      )
      .accounts({
        globalState,
        authority: authority.publicKey,
      })
      .rpc();

    const state = await program.account.globalState.fetch(globalState);
    assert.deepEqual(Array.from(state.merkleRoot), merkleRoot);
    assert.equal(state.totalPayout.toNumber(), totalPayout);
  });

  // TODO: Add claim test with valid merkle proof
  // TODO: Add test for epoch rollover
});
