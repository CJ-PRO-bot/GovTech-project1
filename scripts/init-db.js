import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const dbPath = path.join(dataDir, 'app.db');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

sqlite3.verbose();
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

db.close((err) => {
  if (err) {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  }
  console.log('Database initialized at', dbPath);
});
