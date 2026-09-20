import { useState } from 'react';
import { Arena } from './pages/Arena';
import { Leaderboard } from './pages/Leaderboard';
import { Admin } from './pages/Admin';
import { TermsGate } from './components/TermsGate';
import { hasAcceptedTerms, setAcceptedTerms } from './lib/voter';

type View = 'arena' | 'leaderboard' | 'admin';

const NAV: { key: View; label: string }[] = [
  { key: 'arena', label: 'Arena' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'admin', label: 'Roster' },
];

export default function App() {
  const [view, setView] = useState<View>('arena');
  const [accepted, setAccepted] = useState(hasAcceptedTerms());

  return (
    <div className="min-h-screen bg-neutral-950">
      {!accepted && (
        <TermsGate
          onAccept={() => {
            setAcceptedTerms();
            setAccepted(true);
          }}
        />
      )}

      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-display text-xl font-black text-mash-gold">NameMash</span>
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
        {view === 'arena' && <Arena />}
        {view === 'leaderboard' && <Leaderboard />}
        {view === 'admin' && <Admin />}
      </main>
    </div>
  );
}
