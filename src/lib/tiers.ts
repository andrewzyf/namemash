import type { Contender } from './types';

// Relative tiering: rank among currently-loaded contenders, not fixed
// rating bands, so tiers stay meaningful as the whole pool shifts.
export function assignTiers(itemsSortedDesc: Contender[]): Contender[] {
  const n = itemsSortedDesc.length;
  return itemsSortedDesc.map((item, index) => {
    const percentile = n <= 1 ? 0 : index / (n - 1);
    let tier: Contender['tier'];
    if (percentile <= 0.1) tier = 'S';
    else if (percentile <= 0.3) tier = 'A';
    else if (percentile <= 0.7) tier = 'B';
    else if (percentile <= 0.9) tier = 'C';
    else tier = 'D';
    return { ...item, rank: index + 1, tier };
  });
}
