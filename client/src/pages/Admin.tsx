import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import type { Contender } from '../lib/types';
import { hasAcceptedTerms, setAcceptedTerms } from '../lib/voter';

export function Admin() {
  const [items, setItems] = useState<Contender[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedTerms());

  const load = useCallback(async () => {
    setItems(await api.getItems());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onUpdate() {
      load();
    }
    socket.on('roster:update', onUpdate);
    socket.on('leaderboard:update', onUpdate);
    return () => {
      socket.off('roster:update', onUpdate);
      socket.off('leaderboard:update', onUpdate);
    };
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!termsAccepted) {
      setError('You must accept the acceptable-use terms below before adding a contender.');
      return;
    }
    try {
      await api.addContender(name, category || null, true);
      setName('');
      setCategory('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contender.');
    }
  }

  async function handleRemove(id: string) {
    await api.deleteContender(id);
    load();
  }

  async function handleReset(id: string) {
    await api.resetContender(id);
    load();
  }

  async function handleResetAll() {
    if (!confirm('Reset every contender to 1500 Smashes and clear all records?')) return;
    await api.resetAll();
    load();
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
      </form>

      <div className="mb-4 flex justify-end">
        <button
          onClick={handleResetAll}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-xs text-neutral-400 hover:border-red-500 hover:text-red-400"
        >
          Reset All Ratings
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Actions</th>
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
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleReset(item.id)} className="mr-3 text-xs text-neutral-400 hover:text-neutral-100">
                    Reset
                  </button>
                  <button onClick={() => handleRemove(item.id)} className="text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
