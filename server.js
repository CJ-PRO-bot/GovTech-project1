import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite setup
sqlite3.verbose();
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const db = new sqlite3.Database(path.join(dataDir, 'app.db'));

// Ensure tables exist
const ensureTables = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
};
ensureTables();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
  secret: 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to expose user to templates if needed
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Simple email validator
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email) || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ ok: false, error: 'Invalid email or password too short (min 8 chars).' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email.toLowerCase(), hash], function (err) {
      if (err) {
        if (err && err.message && err.message.includes('UNIQUE')) {
          return res.status(409).json({ ok: false, error: 'Email already registered.' });
        }
        return res.status(500).json({ ok: false, error: 'Database error.' });
      }
      req.session.user = { id: this.lastID, email: email.toLowerCase() };
      return res.json({ ok: true });
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Server error.' });
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ ok: false, error: 'Invalid credentials.' });
  }
  db.get('SELECT id, email, password_hash FROM users WHERE email = ?', [email.toLowerCase()], async (err, row) => {
    if (err) return res.status(500).json({ ok: false, error: 'Database error.' });
    if (!row) return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ ok: false, error: 'Invalid email or password.' });
    req.session.user = { id: row.id, email: row.email };
    return res.json({ ok: true });
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
