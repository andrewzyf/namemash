export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

// Row shape as stored in Supabase (snake_case, matches supabase_setup.sql).
export interface ContenderRow {
  id: string;
  name: string;
  category: string | null;
  smash_rating: number;
  wins: number;
  losses: number;
  created_at: string;
}

// View-model shape used throughout the UI (camelCase + derived fields).
export interface Contender {
  id: string;
  name: string;
  category: string | null;
  smashRating: number;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  tier: Tier | null;
  rank?: number;
  createdAt: string;
}

export function toContender(row: ContenderRow): Contender {
  const totalMatches = row.wins + row.losses;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    smashRating: row.smash_rating,
    wins: row.wins,
    losses: row.losses,
    totalMatches,
    winRate: totalMatches > 0 ? row.wins / totalMatches : 0,
    tier: null,
    createdAt: row.created_at,
  };
}

export interface SmashResult {
  winner_id: string;
  winner_rating: number;
  winner_delta: number;
  loser_id: string;
  loser_rating: number;
  loser_delta: number;
}
