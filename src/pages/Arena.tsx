import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { fetchLeaderboard, castVote, subscribeToContenders } from '../lib/contenders';
import { assignTiers } from '../lib/tiers';
import { pickPair } from '../lib/matchmaking';
import type { Contender, ContenderRow } from '../lib/types';
import { ContenderCard } from '../components/ContenderCard';

type Delta = { id: number; value: number } | null;

export function Arena() {
  const [pair, setPair] = useState<Contender[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulsing, setPulsing] = useState<'left' | 'right' | null>(null);
  const [deltas, setDeltas] = useState<{ left: Delta; right: Delta }>({ left: null, right: null });
  const deltaCounter = useRef(0);
  const pairRef = useRef<Contender[] | null>(null);

  useEffect(() => {
    pairRef.current = pair;
  }, [pair]);

  const loadPair = useCallback(async (excludeIds: string[] = []) => {
    setLoading(true);
    setError(null);
    try {
      const roster = assignTiers(await fetchLeaderboard());
      const next = pickPair(roster, excludeIds);
      if (!next) {
        setError('Not enough active contenders to build a matchup. Add more in Roster.');
        setPair(null);
        return;
      }
      setPair(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load a matchup.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPair();
  }, [loadPair]);

  const smash = useCallback(
    async (winnerIndex: 0 | 1) => {
      if (!pair || voting) return;
      const winner = pair[winnerIndex];
      const loser = pair[winnerIndex === 0 ? 1 : 0];
      setVoting(true);
      setPulsing(winnerIndex === 0 ? 'left' : 'right');

      try {
        const result = await castVote(winner.id, loser.id);
        deltaCounter.current += 1;
        const id = deltaCounter.current;
        setDeltas({
          left: winnerIndex === 0 ? { id, value: result.winner_delta } : { id, value: result.loser_delta },
          right: winnerIndex === 1 ? { id, value: result.winner_delta } : { id, value: result.loser_delta },
        });

        setTimeout(async () => {
          setDeltas({ left: null, right: null });
          setPulsing(null);
          await loadPair([winner.id, loser.id]);
          setVoting(false);
        }, 550);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record vote.');
        setVoting(false);
        setPulsing(null);
      }
    },
    [pair, voting, loadPair]
  );

  const skip = useCallback(() => {
    if (!pair || voting) return;
    loadPair(pair.map((c) => c.id));
  }, [pair, voting, loadPair]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '1' || e.key === 'ArrowLeft') smash(0);
      else if (e.key === '2' || e.key === 'ArrowRight') smash(1);
      else if (e.key === ' ') {
        e.preventDefault();
        skip();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [smash, skip]);

  // Live cross-device feedback: if someone elsewhere smashes a contender
  // that's currently on screen here, flash its updated score + delta
  // without disrupting the local voting flow.
  useEffect(() => {
    const unsubscribe = subscribeToContenders((payload: RealtimePostgresChangesPayload<ContenderRow>) => {
      if (payload.eventType !== 'UPDATE' || !pairRef.current) return;
      const updatedId = payload.new?.id;
      const sideIndex = pairRef.current.findIndex((c) => c.id === updatedId);
      if (sideIndex === -1) return;

      const oldRating = payload.old?.smash_rating;
      const newRating = payload.new?.smash_rating;
      if (typeof oldRating !== 'number' || typeof newRating !== 'number') return;
      const delta = Math.round((newRating - oldRating) * 100) / 100;
      if (delta === 0) return;

      const side = sideIndex === 0 ? 'left' : 'right';
      deltaCounter.current += 1;
      setDeltas((prev) => ({ ...prev, [side]: { id: deltaCounter.current, value: delta } }));
      setPair((prev) =>
        prev ? prev.map((c, i) => (i === sideIndex ? { ...c, smashRating: newRating } : c)) : prev
      );
      setTimeout(() => {
        setDeltas((prev) => ({ ...prev, [side]: null }));
      }, 1100);
    });
    return unsubscribe;
  }, []);

  if (loading && !pair) {
    return <div className="flex h-64 items-center justify-center text-neutral-500">Loading matchup…</div>;
  }

  if (error && !pair) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-neutral-400">
        <p>{error}</p>
        <button onClick={() => loadPair()} className="rounded-lg bg-mash-red px-4 py-2 text-sm text-white">
          Retry
        </button>
      </div>
    );
  }

  if (!pair) return null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="font-display text-4xl font-black text-neutral-50 sm:text-5xl">NameMash by rukawa_229 PLEASE DO NOT SHARE THIS TO FEMALES</h1>
        <p className="mt-2 text-neutral-400">Which one gets the Smash?</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid w-full grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
        <ContenderCard
          contender={pair[0]}
          side="left"
          onSmash={() => smash(0)}
          disabled={voting}
          pulsing={pulsing === 'left'}
          delta={deltas.left}
          keyHint="1 or ←"
        />
        <ContenderCard
          contender={pair[1]}
          side="right"
          onSmash={() => smash(1)}
          disabled={voting}
          pulsing={pulsing === 'right'}
          delta={deltas.right}
          keyHint="2 or →"
        />
      </div>

      <button
        onClick={skip}
        disabled={voting}
        className="rounded-full border border-neutral-700 px-6 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-40"
      >
        Skip (Space)
      </button>
    </div>
  );
}
