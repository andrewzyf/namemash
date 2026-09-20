export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Contender {
  id: string;
  name: string;
  category: string | null;
  smashRating: number;
  wins: number;
  losses: number;
  totalSmashes: number;
  winRate: number;
  tier: Tier | null;
  rank?: number;
  createdAt: string;
}

export interface VoteResult {
  winner: Contender;
  loser: Contender;
  winnerDelta: number;
  loserDelta: number;
}
