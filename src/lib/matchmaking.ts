import type { Contender } from './types';

const LOW_EXPOSURE_THRESHOLD = 8;
const NEIGHBOR_POOL = 5;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Prioritizes contenders with few total matches so new/underexposed
// entries converge quickly, then pairs by nearest current rating.
// Runs entirely client-side against the currently loaded roster — there is
// no server to own matchmaking in this serverless architecture.
export function pickPair(pool: Contender[], excludeIds: string[] = []): [Contender, Contender] | null {
  const excluded = new Set(excludeIds);
  const all = pool.filter((c) => !excluded.has(c.id));
  if (all.length < 2) return null;

  const underexposed = all.filter((c) => c.totalMatches < LOW_EXPOSURE_THRESHOLD);
  const candidatesForA = underexposed.length > 0 ? underexposed : all;
  const itemA = pickRandom(candidatesForA);

  const rest = all.filter((c) => c.id !== itemA.id);
  const byDistance = rest
    .map((item) => ({ item, distance: Math.abs(item.smashRating - itemA.smashRating) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, NEIGHBOR_POOL);

  const itemB = pickRandom(byDistance).item;

  return Math.random() < 0.5 ? [itemA, itemB] : [itemB, itemA];
}
