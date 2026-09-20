import { useState } from 'react';

interface TermsGateProps {
  onAccept: () => void;
}

export function TermsGate({ onAccept }: TermsGateProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-mash-gold">Before you Smash</h2>
        <p className="mt-4 text-sm leading-relaxed text-neutral-300">
          NameMash is for ranking <strong>non-personal contenders</strong> — fictional names, baby-name
          shortlists, brand names, and similar creative options.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-400">
          <li>Do not upload real people's names, photos, or personally identifying information.</li>
          <li>Do not upload a real school, class, or workplace roster.</li>
          <li>Do not rate real individuals without their explicit, informed consent.</li>
        </ul>
        <p className="mt-3 text-sm text-neutral-400">
          Entries that violate this policy will be removed. Continued misuse may restrict access.
        </p>

        <label className="mt-6 flex items-start gap-3 text-sm text-neutral-200">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 accent-mash-red"
          />
          I understand and agree to these terms.
        </label>

        <button
          disabled={!checked}
          onClick={onAccept}
          className="mt-6 w-full rounded-lg bg-mash-red py-3 font-bold uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enter the Arena
        </button>
      </div>
    </div>
  );
}
