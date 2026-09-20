# NameMash

A real-time, pairwise "smash" ranking platform in the spirit of Facemash — but
built for names, fictional characters, brand options, and other **non-personal**
contenders. All Elo-style ratings and stats are dubbed "Smashes" (Smash Rating,
Smash Leaderboard).

## Acceptable use

NameMash is scoped to fictional characters, baby-name shortlists, brand/product
naming, media rankings, and similar creative benchmarking. The moderation layer
(client-side checks + a DB-level length/uniqueness constraint) rejects anything
that looks like PII (emails, phone numbers, long digit runs) or roster/classmate
references, and the UI requires explicit agreement to these terms before
contenders can be added. **Do not use this app to rate real, identifiable
people without their informed consent** — that use case is out of scope and
not supported.

## Stack

Single-app, serverless architecture:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4, deployed as a
  static build to Vercel.
- **Backend**: Supabase — PostgreSQL holds the `contenders` table, a
  `record_smash` stored function computes and applies the Elo ("Smash") update
  atomically (row locks in `supabase_setup.sql` prevent stale-rating races
  under concurrent votes), and Supabase Realtime pushes every rating change to
  all connected browsers over `postgres_changes` on the `contenders` table.

There is no server directory and nothing to run except the frontend — Supabase
*is* the backend.

## One-time Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and paste in the entire contents of
   [`supabase_setup.sql`](./supabase_setup.sql), then run it. This creates the
   `contenders` table, the `record_smash(winner_id, loser_id)` function, adds
   the table to the `supabase_realtime` publication, and sets up Row Level
   Security (public read, public insert for new contenders, and a grant to
   execute `record_smash` — ratings can only change through that function,
   never a direct client UPDATE).
3. Grab your Project URL and `anon` public API key from
   **Project Settings → API**.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Open http://localhost:5173. Once the roster is empty (a fresh project), hit
**Roster → Seed Placeholder Roster** in the UI to populate it, or add
contenders one at a time.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel — it auto-detects the
   Vite framework preset (`npm run build`, output directory `dist`).
2. In the Vercel project's **Environment Variables**, set `VITE_SUPABASE_URL`
   and `VITE_SUPABASE_ANON_KEY` (same values as `.env.local`).
3. Deploy. There's no server-side runtime to configure — the built app talks
   directly to Supabase over HTTPS + WebSocket from the browser.

## Swapping in your own roster

The placeholder seed roster lives in one file: `src/data/seed-roster.json`, an
array of `{ "name": "...", "category": "..." }` objects (`category` is
optional).

1. Edit `src/data/seed-roster.json` with your own contenders.
2. From **Roster → Seed Placeholder Roster (if empty)** in the UI — this only
   inserts if the `contenders` table is currently empty, so truncate the table
   first (SQL Editor: `truncate table contenders;`) if you want to replace an
   existing roster rather than add to it.

You can also add contenders one at a time from the **Roster** tab without
touching the file at all. New entries go through the same moderation checks as
the seed file (name length, no email/phone/PII-like patterns, duplicate-name
detection) and require checking the "not a real, identifiable person" box.

## How the Smash Rating works

Standard logistic Elo, computed inside `record_smash` in Postgres:

```
E_A = 1 / (1 + 10^((R_B - R_A) / 400))
R'_A = R_A + K * (result_A - E_A)      -- K = 32
```

Both contenders' rows are locked (in a fixed `id` order, to avoid deadlocks
between two opposite-direction votes on the same pair) and updated in one
function call, so concurrent votes never read-modify-write a stale rating.
Tiers (S/A/B/C/D) are relative percentile bands recomputed client-side from
the live ranking, not fixed rating thresholds. Matchmaking (pairing
similarly-rated or under-exposed contenders) also runs client-side against
the fetched roster, since there's no server to own that logic.

## Data access (`src/lib/`)

- `contenders.ts` — `fetchLeaderboard()`, `castVote()` (calls the
  `record_smash` RPC), `addContender()`, `seedRosterIfEmpty()`,
  `subscribeToContenders()` (wraps a Supabase Realtime channel on
  `postgres_changes` for the `contenders` table)
- `matchmaking.ts` — client-side pair selection
- `moderation.ts` — name/category sanitization mirroring the DB constraints
- `tiers.ts` — S/A/B/C/D percentile banding
- `supabase.ts` — the shared Supabase client, initialized from
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
