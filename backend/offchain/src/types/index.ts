export type PublicKeyString = string;

export interface ParticipantSnapshot {
  owner: PublicKeyString;
  depositedUsdc: number;
  eligible: boolean;
  lastDepositTime: number;
}

export interface DistributionShare {
  owner: PublicKeyString;
  amount: bigint;
}

export interface MerkleNode {
  address: PublicKeyString;
  amount: bigint;
  proof: string[];
}

export interface DistributionBundle {
  epoch: number;
  totalPayout: bigint;
  root: string;
  leaves: MerkleNode[];
  streamflowDistributorId?: string;
}
