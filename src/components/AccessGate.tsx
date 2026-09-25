import { useState } from 'react';
import type { AuthSession } from '../lib/auth';
import { verifyInviteCode } from '../lib/auth';

interface AccessGateProps {
  onVerified: (session: AuthSession) => void;
}

export function AccessGate({ onVerified }: AccessGateProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await verifyInviteCode(code);
      onVerified(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify invite code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-mash-gold">Enter your invite code</h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          NameMash is invite-only. Enter the code you were given to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite code"
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-mash-red"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={!code.trim() || submitting}
            className="mt-2 w-full rounded-lg bg-mash-red py-3 font-bold uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Verifying…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
