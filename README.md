# NameMash

A real-time, pairwise "smash" ranking platform in the spirit of Facemash — but
built for names, fictional characters, brand options, and other **non-personal**
contenders. All Elo-style ratings and stats are dubbed "Smashes" (Smash Rating,
Total Smashes, Smash Leaderboard).

## Acceptable use

NameMash is scoped to fictional characters, baby-name shortlists, brand/product
naming, media rankings, and similar creative benchmarking. The app's schema and
moderation layer actively reject anything that looks like PII (emails, phone
numbers, long digit runs) or roster/classmate references, and the UI requires
explicit agreement to these terms before contenders can be added. **Do not use
this app to rate real, identifiable people without their informed consent** —
that use case is out of scope and not supported.

## Stack

- **Server**: Node.js + Express + SQLite (`better-sqlite3`) + Socket.IO.
  Elo updates run inside a single SQLite transaction per vote, so concurrent
  votes from different users never read-modify-write stale ratings.
- **Client**: React + TypeScript + Vite + Tailwind CSS v4.

## Running locally

```bash
# Terminal 1 — API + WebSocket server (port 4000)
cd server
npm install
npm run seed   # populates the roster from src/seed/names.json
npm run dev

# Terminal 2 — frontend (port 5173, proxies /api and /socket.io to :4000)
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## Swapping in your own roster

The seed roster lives in one file: `server/src/seed/names.json`, an array of
`{ "name": "...", "category": "..." }` objects (`category` is optional).

1. Edit `server/src/seed/names.json` with your own contenders.
2. Re-run `npm run seed` from `server/` — this wipes and repopulates `items`
   and `votes` from that file.

You can also manage the roster live without touching the DB directly, via the
**Roster** tab in the UI (add/remove/reset individual contenders, or reset
every rating back to 1500). New entries added there go through the same
moderation checks as the seed file (name length, no email/phone/PII-like
patterns) and require checking the "not a real, identifiable person" box.

## How the Smash Rating works

Standard logistic Elo:

```
E_A = 1 / (1 + 10^((R_B - R_A) / 400))
R'_A = R_A + K * (result_A - E_A)
```

`K` starts at 48 for a contender's first 10 matches (fast convergence for new
entries), drops to 32 through match 30, then settles at 20. Tiers (S/A/B/C/D)
are relative percentile bands recomputed from the live ranking, not fixed
rating thresholds.

## API overview

- `GET /api/items?category=&tier=&search=` — leaderboard, ranked desc by rating
- `GET /api/categories` — distinct categories in the active roster
- `GET /api/arena/next?exclude=id1,id2` — next matchup (rating-proximity + low
  total-smashes matchmaking)
- `POST /api/vote { winnerId, loserId, voterId }` — atomic Elo update, broadcasts
  `leaderboard:update` over Socket.IO to every connected client
- `POST /api/admin/items { name, category, acceptedTerms }` — add a contender
- `PATCH /api/admin/items/:id`, `DELETE /api/admin/items/:id`
- `POST /api/admin/items/:id/reset`, `POST /api/admin/reset-all`
