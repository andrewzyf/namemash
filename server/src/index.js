import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import { db } from './db.js';
import { computeSmashUpdate, assignTiers } from './elo.js';
import { pickPair } from './matchmaking.js';
import { validateContenderName, validateCategory } from './moderation.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// --- helpers -------------------------------------------------------------

function getLeaderboard({ category, tier, search } = {}) {
  let items = db.prepare('SELECT * FROM items WHERE active = 1 ORDER BY smash_rating DESC').all();
  const tiered = assignTiers(items);

  return tiered.filter((item) => {
    if (category && item.category !== category) return false;
    if (tier && item.tier !== tier) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
}

function serializeItem(item, tierMap) {
  const winRate = item.wins + item.losses > 0 ? item.wins / (item.wins + item.losses) : 0;
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    smashRating: item.smash_rating,
    wins: item.wins,
    losses: item.losses,
    totalSmashes: item.total_smashes,
    winRate,
    tier: tierMap?.get(item.id) ?? null,
    createdAt: item.created_at,
  };
}

function currentTierMap() {
  const ranked = assignTiers(db.prepare('SELECT * FROM items WHERE active = 1 ORDER BY smash_rating DESC').all());
  return new Map(ranked.map((r) => [r.id, r.tier]));
}

// --- routes: items / leaderboard -----------------------------------------

app.get('/api/items', (req, res) => {
  const { category, tier, search } = req.query;
  const rows = getLeaderboard({ category, tier, search });
  res.json(rows.map((r) => ({ ...serializeItem(r, null), tier: r.tier, rank: r.rank })));
});

app.get('/api/categories', (req, res) => {
  const rows = db
    .prepare('SELECT DISTINCT category FROM items WHERE active = 1 AND category IS NOT NULL ORDER BY category')
    .all();
  res.json(rows.map((r) => r.category));
});

// --- routes: arena ---------------------------------------------------------

app.get('/api/arena/next', (req, res) => {
  const exclude = (req.query.exclude || '').split(',').filter(Boolean);
  const pair = pickPair(exclude);
  if (!pair) {
    return res.status(409).json({ error: 'Not enough active contenders to build a matchup.' });
  }
  const tierMap = currentTierMap();
  res.json(pair.map((item) => serializeItem(item, tierMap)));
});

app.post('/api/vote', (req, res) => {
  const { winnerId, loserId, voterId } = req.body || {};
  if (!winnerId || !loserId || winnerId === loserId) {
    return res.status(400).json({ error: 'winnerId and loserId are required and must differ.' });
  }

  try {
    const result = db.transaction(() => {
      const winner = db.prepare('SELECT * FROM items WHERE id = ? AND active = 1').get(winnerId);
      const loser = db.prepare('SELECT * FROM items WHERE id = ? AND active = 1').get(loserId);
      if (!winner || !loser) {
        const err = new Error('One or both contenders were not found.');
        err.status = 404;
        throw err;
      }

      const { winnerDelta, loserDelta } = computeSmashUpdate(
        winner.smash_rating,
        winner.total_smashes,
        loser.smash_rating,
        loser.total_smashes
      );

      const newWinnerRating = winner.smash_rating + winnerDelta;
      const newLoserRating = loser.smash_rating + loserDelta;

      db.prepare(
        `UPDATE items SET smash_rating = ?, wins = wins + 1, total_smashes = total_smashes + 1 WHERE id = ?`
      ).run(newWinnerRating, winner.id);

      db.prepare(
        `UPDATE items SET smash_rating = ?, losses = losses + 1, total_smashes = total_smashes + 1 WHERE id = ?`
      ).run(newLoserRating, loser.id);

      db.prepare(
        `INSERT INTO votes (id, winner_id, loser_id, winner_prev_smashes, loser_prev_smashes, winner_smash_delta, loser_smash_delta, voter_id)
         VALUES (@id, @winnerId, @loserId, @winnerPrev, @loserPrev, @winnerDelta, @loserDelta, @voterId)`
      ).run({
        id: uuidv4(),
        winnerId: winner.id,
        loserId: loser.id,
        winnerPrev: winner.smash_rating,
        loserPrev: loser.smash_rating,
        winnerDelta,
        loserDelta,
        voterId: voterId ?? null,
      });

      return { winnerDelta, loserDelta, newWinnerRating, newLoserRating };
    })();

    const tierMap = currentTierMap();
    const winner = serializeItem(db.prepare('SELECT * FROM items WHERE id = ?').get(winnerId), tierMap);
    const loser = serializeItem(db.prepare('SELECT * FROM items WHERE id = ?').get(loserId), tierMap);

    io.emit('leaderboard:update', {
      winner,
      loser,
      winnerDelta: result.winnerDelta,
      loserDelta: result.loserDelta,
    });

    res.json({ winner, loser, winnerDelta: result.winnerDelta, loserDelta: result.loserDelta });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to record vote.' });
  }
});

// --- routes: admin ----------------------------------------------------------

app.post('/api/admin/items', (req, res) => {
  const { name, category, acceptedTerms } = req.body || {};
  if (!acceptedTerms) {
    return res.status(403).json({ error: 'You must accept the acceptable-use terms to add a contender.' });
  }
  const nameCheck = validateContenderName(name);
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.reason });
  const categoryCheck = validateCategory(category);
  if (!categoryCheck.ok) return res.status(400).json({ error: categoryCheck.reason });

  const item = {
    id: uuidv4(),
    name: nameCheck.name,
    category: categoryCheck.category,
  };
  db.prepare(
    `INSERT INTO items (id, name, category, smash_rating, wins, losses, total_smashes, active)
     VALUES (@id, @name, @category, 1500, 0, 0, 0, 1)`
  ).run(item);

  const tierMap = currentTierMap();
  const full = serializeItem(db.prepare('SELECT * FROM items WHERE id = ?').get(item.id), tierMap);
  io.emit('roster:update');
  res.status(201).json(full);
});

app.patch('/api/admin/items/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Contender not found.' });

  const updates = {};
  if (req.body.name !== undefined) {
    const nameCheck = validateContenderName(req.body.name);
    if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.reason });
    updates.name = nameCheck.name;
  }
  if (req.body.category !== undefined) {
    const categoryCheck = validateCategory(req.body.category);
    if (!categoryCheck.ok) return res.status(400).json({ error: categoryCheck.reason });
    updates.category = categoryCheck.category;
  }
  if (req.body.active !== undefined) {
    updates.active = req.body.active ? 1 : 0;
  }

  const fields = Object.keys(updates);
  if (fields.length > 0) {
    const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE items SET ${setClause} WHERE id = @id`).run({ ...updates, id });
  }

  const tierMap = currentTierMap();
  const full = serializeItem(db.prepare('SELECT * FROM items WHERE id = ?').get(id), tierMap);
  io.emit('roster:update');
  res.json(full);
});

app.delete('/api/admin/items/:id', (req, res) => {
  const { id } = req.params;
  const hasVotes = db
    .prepare('SELECT COUNT(*) AS c FROM votes WHERE winner_id = ? OR loser_id = ?')
    .get(id, id).c;

  if (hasVotes > 0) {
    db.prepare('UPDATE items SET active = 0 WHERE id = ?').run(id);
  } else {
    db.prepare('DELETE FROM items WHERE id = ?').run(id);
  }
  io.emit('roster:update');
  res.status(204).end();
});

app.post('/api/admin/items/:id/reset', (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE items SET smash_rating = 1500, wins = 0, losses = 0, total_smashes = 0 WHERE id = ?').run(id);
  const tierMap = currentTierMap();
  const full = serializeItem(db.prepare('SELECT * FROM items WHERE id = ?').get(id), tierMap);
  io.emit('roster:update');
  res.json(full);
});

app.post('/api/admin/reset-all', (req, res) => {
  db.prepare('UPDATE items SET smash_rating = 1500, wins = 0, losses = 0, total_smashes = 0').run();
  io.emit('roster:update');
  res.status(204).end();
});

io.on('connection', () => {
  // No per-connection state needed; leaderboard/roster events are broadcast globally.
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`NameMash server listening on http://localhost:${PORT}`);
});
