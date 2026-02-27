import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import { PublicKey } from "@solana/web3.js";
import { DistributionShare, DistributionBundle, MerkleNode } from "../types/index.js";

const leafHash = (address: string, amount: bigint): Buffer => {
  const owner = new PublicKey(address).toBuffer();
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);
  return keccak256(Buffer.concat([owner, amountBuf]));
};

export const buildMerkle = (epoch: number, shares: DistributionShare[]): DistributionBundle => {
  const leaves = shares.map(({ owner, amount }) => leafHash(owner, amount));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();

  const nodes: MerkleNode[] = shares.map(({ owner, amount }) => ({
    address: owner,
    amount,
    proof: tree.getHexProof(leafHash(owner, amount)),
  }));

  const totalPayout = shares.reduce((sum, item) => sum + item.amount, 0n);

  return { epoch, totalPayout, root, leaves: nodes };
};
