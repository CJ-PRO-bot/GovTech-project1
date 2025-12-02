const express = require('express');
const db = require('../db');

const router = express.Router();

function requireAuth(req, res, next){
  if(!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT id,name,role,email FROM users WHERE email = ?').get(req.session.user.email);
  res.json({ user: u });
});

router.put('/me', requireAuth, (req, res) => {
  const { name, role } = req.body || {};
  if(!name) return res.status(400).json({ error: 'Name required' });
  db.prepare('UPDATE users SET name=?, role=? WHERE email=?').run(name, role || '', req.session.user.email);
  res.json({ ok: true });
});

module.exports = router;
