import { useState } from 'react';
import { Arena } from './pages/Arena';
import { Leaderboard } from './pages/Leaderboard';
import { Admin } from './pages/Admin';
import { TermsGate } from './components/TermsGate';
import { AccessGate } from './components/AccessGate';
import { hasAcceptedTerms, setAcceptedTerms } from './lib/terms';
import { getSession, clearSession, type SessionData } from './lib/auth';

type View = 'arena' | 'leaderboard' | 'admin';

const NAV: { key: View; label: string }[] = [
  { key: 'arena', label: 'Arena' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'admin', label: 'Roster' },
];

export default function App() {
  const [view, setView] = useState<View>('arena');
  const [accepted, setAccepted] = useState(hasAcceptedTerms());
  const [session, setSession] = useState<SessionData | null>(getSession());

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {!session && <AccessGate onVerified={setSession} />}
      {!accepted && (
        <TermsGate
          onAccept={() => {
            setAcceptedTerms();
            setAccepted(true);
          }}
        />
      )}

      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tight text-white">
              NAME<span className="text-rose-500">MASH</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  view === n.key
                    ? 'bg-rose-500 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {view === 'arena' && (
          <Arena voterCode={session?.code} voterName={session?.assigned_to} />
        )}
        {view === 'leaderboard' && <Leaderboard />}
        {view === 'admin' && <Admin />}
      </main>

      {session && (
        <footer className="border-t border-neutral-900 py-3 px-4 text-center text-xs text-neutral-500 flex items-center justify-center gap-3">
          <span>Logged in as: <strong className="text-neutral-300">{session.assigned_to}</strong></span>
          <button
            onClick={() => {
              clearSession();
              setSession(null);
            }}
            className="text-neutral-400 hover:text-rose-400 underline transition-colors"
          >
            Switch Code / Log out
          </button>
        </footer>
      )}
    </div>
  );
}
