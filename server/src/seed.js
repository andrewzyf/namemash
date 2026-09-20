import { v4 as uuidv4 } from 'uuid';
import { db } from './db.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const namesPath = path.join(__dirname, 'seed', 'names.json');

function seed() {
  const names = JSON.parse(readFileSync(namesPath, 'utf-8'));

  const wipe = db.prepare('DELETE FROM votes');
  const wipeItems = db.prepare('DELETE FROM items');
  const insert = db.prepare(`
    INSERT INTO items (id, name, category, smash_rating, wins, losses, total_smashes, active)
    VALUES (@id, @name, @category, 1500, 0, 0, 0, 1)
  `);

  const run = db.transaction((rows) => {
    wipe.run();
    wipeItems.run();
    for (const row of rows) {
      insert.run({ id: uuidv4(), name: row.name, category: row.category ?? null });
    }
  });

  run(names);
  console.log(`Seeded ${names.length} contenders from ${namesPath}`);
}

seed();
