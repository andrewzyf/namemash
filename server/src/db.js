import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.NAMEMASH_DB_PATH || path.join(__dirname, '..', 'data', 'namemash.db');

import fs from 'node:fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    smash_rating REAL NOT NULL DEFAULT 1500,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    total_smashes INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    winner_id TEXT NOT NULL REFERENCES items(id),
    loser_id TEXT NOT NULL REFERENCES items(id),
    winner_prev_smashes REAL NOT NULL,
    loser_prev_smashes REAL NOT NULL,
    winner_smash_delta REAL NOT NULL,
    loser_smash_delta REAL NOT NULL,
    voter_id TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_votes_winner ON votes(winner_id);
  CREATE INDEX IF NOT EXISTS idx_votes_loser ON votes(loser_id);
  CREATE INDEX IF NOT EXISTS idx_items_active ON items(active);
`);
