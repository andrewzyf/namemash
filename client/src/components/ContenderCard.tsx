import type { Contender } from '../lib/types';
import { TierBadge } from './TierBadge';
import { DeltaFloat } from './DeltaFloat';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

interface ContenderCardProps {
  contender: Contender;
  side: 'left' | 'right';
  onSmash: () => void;
  disabled: boolean;
  pulsing: boolean;
  delta: { id: number; value: number } | null;
  keyHint: string;
}

export function ContenderCard({ contender, onSmash, disabled, pulsing, delta, keyHint }: ContenderCardProps) {
  return (
    <button
      onClick={onSmash}
      disabled={disabled}
      className={`group relative flex w-full flex-col items-center gap-5 overflow-hidden rounded-2xl border-2 border-neutral-800 bg-neutral-900/80 p-8 text-center transition-all hover:border-mash-red hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 sm:p-10 ${
        pulsing ? 'animate-pulse-ring border-mash-red' : ''
      }`}
    >
      {delta && <DeltaFloat id={delta.id} value={delta.value} />}

      <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-mash-red bg-gradient-to-br from-neutral-800 to-neutral-950 text-3xl font-black tracking-wide sm:h-28 sm:w-28 sm:text-4xl">
        {initials(contender.name)}
      </div>

      <div className="flex items-center gap-2">
        <h2 className="font-display text-2xl font-bold text-neutral-50 sm:text-3xl">{contender.name}</h2>
        <TierBadge tier={contender.tier} />
      </div>

      {contender.category && (
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs uppercase tracking-wider text-neutral-400">
          {contender.category}
        </span>
      )}

      <div className="text-sm text-neutral-400">
        Smash Score <span className="font-semibold text-neutral-200">{Math.round(contender.smashRating)}</span>
      </div>

      <div className="mt-2 w-full rounded-lg bg-mash-red px-6 py-3 text-lg font-black uppercase tracking-widest text-white shadow-lg transition-transform group-hover:scale-[1.02] group-active:scale-95">
        Smash
      </div>

      <span className="text-xs text-neutral-500">Press {keyHint}</span>
    </button>
  );
}
