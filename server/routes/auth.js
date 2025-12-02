const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function getUserByEmail(email){
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

router.get('/me', (req, res) => {
  if(!req.session.user){ return res.json({ user: null }); }
  const user = getUserByEmail(req.session.user.email);
  if(!user){ req.session.destroy(()=>{}); return res.json({ user: null }); }
  res.json({ user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

router.post('/signup', async (req, res) => {
  const { name, role, email, password } = req.body || {};
  if(!name || !email || !password){ return res.status(400).json({ error: 'Missing fields' }); }
  if(!/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if(password.length < 6) return res.status(400).json({ error: 'Weak password' });

  const exists = getUserByEmail(email.toLowerCase());
  if(exists) return res.status(409).json({ error: 'Email already exists' });

  const password_hash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.prepare('INSERT INTO users (id,name,role,email,password_hash,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, name, role || '', email.toLowerCase(), password_hash, created_at);

  req.session.user = { email: email.toLowerCase() };
  res.json({ ok: true });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if(!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = getUserByEmail(email.toLowerCase());
  if(!user) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if(!ok) return res.status(401).json({ error: 'Invalid password' });
  req.session.user = { email: user.email };
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

module.exports = router;
