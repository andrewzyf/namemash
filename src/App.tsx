import { useState } from 'react';
import { Arena } from './pages/Arena';
import { Leaderboard } from './pages/Leaderboard';
import { Admin } from './pages/Admin';
import { TermsGate } from './components/TermsGate';
import { AccessGate } from './components/AccessGate';
import { hasAcceptedTerms, setAcceptedTerms } from './lib/terms';
import { getSession, clearSession, type AuthSession } from './lib/auth';

type View = 'arena' | 'leaderboard' | 'admin';

const NAV: { key: View; label: string }[] = [
  { key: 'arena', label: 'Arena' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'admin', label: 'Roster' },
];

export default function App() {
  const [view, setView] = useState<View>('arena');
  const [accepted, setAccepted] = useState(hasAcceptedTerms());
  const [session, setSession] = useState<AuthSession | null>(getSession());

  return (
    <div className="min-h-screen bg-neutral-950">
      {!session && <AccessGate onVerified={setSession} />}

      {session && !accepted && (
        <TermsGate
          onAccept={() => {
            setAcceptedTerms();
            setAccepted(true);
          }}
        />
      )}

      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-display text-xl font-black text-mash-gold">NameMash by TommyW</span>
          <div className="flex gap-1 rounded-full border border-neutral-800 p-1">
            {NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  view === item.key ? 'bg-mash-red text-white' : 'text-neutral-400 hover:text-neutral-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main>
        {view === 'arena' && <Arena voterCode={session?.code ?? null} voterName={session?.assignedTo ?? null} />}
        {view === 'leaderboard' && <Leaderboard />}
        {view === 'admin' && <Admin />}
      </main>

      {session && (
        <footer className="mx-auto flex max-w-5xl items-center justify-center gap-3 px-4 py-6 text-xs text-neutral-500">
          <span>
            Logged in as: <span className="text-neutral-300">{session.assignedTo}</span>
          </span>
          <button
            onClick={() => {
              clearSession();
              setSession(null);
            }}
            className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-200"
          >
            Switch Code / Log out
          </button>
        </footer>
      )}
    </div>
  );
}
