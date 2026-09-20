import { db } from './db.js';

const LOW_SMASH_THRESHOLD = 8;
const NEIGHBOR_POOL = 5;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Prioritizes contenders with few total smashes so new/underexposed
// entries converge quickly, then pairs by nearest current rating.
export function pickPair(excludeIds = []) {
  const excluded = new Set(excludeIds.filter(Boolean));
  const all = db
    .prepare('SELECT * FROM items WHERE active = 1 ORDER BY smash_rating DESC')
    .all()
    .filter((item) => !excluded.has(item.id));

  if (all.length < 2) return null;

  const underexposed = all.filter((item) => item.total_smashes < LOW_SMASH_THRESHOLD);
  const candidatesForA = underexposed.length > 0 ? underexposed : all;
  const itemA = pickRandom(candidatesForA);

  const rest = all.filter((item) => item.id !== itemA.id);
  const byDistance = rest
    .map((item) => ({ item, distance: Math.abs(item.smash_rating - itemA.smash_rating) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, NEIGHBOR_POOL);

  const itemB = pickRandom(byDistance).item;

  return Math.random() < 0.5 ? [itemA, itemB] : [itemB, itemA];
}
