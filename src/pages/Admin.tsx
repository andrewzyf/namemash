import { useCallback, useEffect, useState } from 'react';
import { fetchLeaderboard, addContender, seedRosterIfEmpty, subscribeToContenders } from '../lib/contenders';
import { validateContenderName, sanitizeCategory } from '../lib/moderation';
import type { Contender } from '../lib/types';
import { hasAcceptedTerms, setAcceptedTerms } from '../lib/terms';

export function Admin() {
  const [items, setItems] = useState<Contender[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedTerms());
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setItems(await fetchLeaderboard());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeToContenders(() => load());
    return unsubscribe;
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!termsAccepted) {
      setError('You must accept the acceptable-use terms below before adding a contender.');
      return;
    }
    const nameCheck = validateContenderName(name);
    if (!nameCheck.ok) {
      setError(nameCheck.reason);
      return;
    }
    try {
      await addContender(nameCheck.name, sanitizeCategory(category));
      setName('');
      setCategory('');
      setInfo(`Added "${nameCheck.name}" to the roster.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contender.');
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setError(null);
    setInfo(null);
    try {
      const added = await seedRosterIfEmpty();
      setInfo(added > 0 ? `Seeded ${added} placeholder contenders.` : 'Roster already has contenders — seed skipped.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed roster.');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display mb-6 text-3xl font-black">Roster Management</h1>

      <form onSubmit={handleAdd} className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">Add Contender</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contender name"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-mash-red"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-mash-red sm:w-48"
          />
          <button type="submit" className="rounded-lg bg-mash-red px-5 py-2 text-sm font-bold text-white">
            Add
          </button>
        </div>

        <label className="mt-4 flex items-start gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked);
              if (e.target.checked) setAcceptedTerms();
            }}
            className="mt-0.5 h-3.5 w-3.5 accent-mash-red"
          />
          I confirm this contender is not a real, identifiable person and contains no PII (fictional names,
          baby-name options, brand names, etc. only).
        </label>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {info && <p className="mt-2 text-sm text-emerald-400">{info}</p>}
      </form>

      <div className="mb-4 flex justify-end">
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-xs text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 disabled:opacity-40"
        >
          {seeding ? 'Seeding…' : 'Seed Placeholder Roster (if empty)'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Record</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-neutral-800">
                <td className="px-4 py-3 text-neutral-100">{item.name}</td>
                <td className="px-4 py-3 text-neutral-400">{item.category ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-neutral-300">
                  {Math.round(item.smashRating)}
                </td>
                <td className="px-4 py-3 text-right text-neutral-400">
                  {item.wins}-{item.losses}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                  Roster is empty — seed it or add a contender above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
