import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { fetchLeaderboard, extractCategories, subscribeToContenders } from '../lib/contenders';
import { assignTiers } from '../lib/tiers';
import type { Contender, ContenderRow, Tier } from '../lib/types';
import { TierBadge } from '../components/TierBadge';

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];
const PODIUM = ['🥇', '🥈', '🥉'];

export function Leaderboard() {
  const [allItems, setAllItems] = useState<Contender[]>([]);
  const [category, setCategory] = useState('');
  const [tier, setTier] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [flashes, setFlashes] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const rows = assignTiers(await fetchLeaderboard());
    setAllItems(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const unsubscribe = subscribeToContenders((payload: RealtimePostgresChangesPayload<ContenderRow>) => {
      load();

      if (payload.eventType === 'UPDATE') {
        const oldRating = payload.old?.smash_rating;
        const newRating = payload.new?.smash_rating;
        const id = payload.new?.id;
        if (id && typeof oldRating === 'number' && typeof newRating === 'number') {
          const delta = Math.round((newRating - oldRating) * 100) / 100;
          if (delta !== 0) {
            setFlashes((prev) => ({ ...prev, [id]: delta }));
            clearTimeout(flashTimers.current[id]);
            flashTimers.current[id] = setTimeout(() => {
              setFlashes((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              });
            }, 2000);
          }
        }
      }
    });
    return unsubscribe;
  }, [load]);

  const categories = extractCategories(allItems);
  const items = allItems.filter((item) => {
    if (category && item.category !== category) return false;
    if (tier && item.tier !== tier) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">Smash Leaderboard</h1>
        <span className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search names…"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-mash-red"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-mash-red"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-mash-red"
        >
          <option value="">All tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              Tier {t}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading standings…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3 text-right">Smash Score</th>
                <th className="px-4 py-3 text-right">Record</th>
                <th className="px-4 py-3 text-right">Win %</th>
                <th className="px-4 py-3 text-right">Total Smashes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-t border-neutral-800 transition-colors hover:bg-neutral-900/60 ${
                    flashes[item.id] !== undefined ? 'bg-mash-red/10' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-neutral-300">
                    {PODIUM[index] ?? `#${item.rank ?? index + 1}`}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-100">
                    {item.name}
                    {item.category && <span className="ml-2 text-xs text-neutral-500">{item.category}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={item.tier} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-200">
                    {Math.round(item.smashRating)}
                    {flashes[item.id] !== undefined && (
                      <span className={`ml-2 text-xs font-bold ${flashes[item.id] >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                        {flashes[item.id] >= 0 ? '+' : ''}
                        {flashes[item.id]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-400">
                    {item.wins}-{item.losses}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-400">{Math.round(item.winRate * 100)}%</td>
                  <td className="px-4 py-3 text-right text-neutral-400">{item.totalMatches}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No contenders match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
