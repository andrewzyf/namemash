import type { Tier } from '../lib/types';

const TIER_STYLES: Record<Tier, string> = {
  S: 'bg-mash-gold text-black border-yellow-300',
  A: 'bg-red-600 text-white border-red-400',
  B: 'bg-orange-600 text-white border-orange-400',
  C: 'bg-neutral-600 text-white border-neutral-400',
  D: 'bg-neutral-800 text-neutral-300 border-neutral-600',
};

export function TierBadge({ tier }: { tier: Tier | null }) {
  if (!tier) return null;
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold ${TIER_STYLES[tier]}`}
      title={`Smash Tier ${tier}`}
    >
      {tier}
    </span>
  );
}
