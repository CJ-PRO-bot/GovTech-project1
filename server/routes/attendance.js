const express = require('express');
const db = require('../db');

const router = express.Router();

function requireAuth(req, res, next){
  if(!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

const todayKey = () => new Date().toISOString().slice(0,10);

router.get('/', requireAuth, (req, res) => {
  const email = req.session.user.email;
  const rows = db.prepare('SELECT date, check_in as checkIn, check_out as checkOut FROM attendance WHERE user_email = ? ORDER BY date ASC').all(email);
  res.json({ records: rows });
});

router.post('/checkin', requireAuth, (req, res) => {
  const email = req.session.user.email;
  const today = todayKey();
  const now = new Date().toISOString();
  try{
    db.prepare('INSERT INTO attendance (user_email,date,check_in) VALUES (?,?,?)').run(email, today, now);
  } catch(err){
    // If exists, update check_in if empty
    const row = db.prepare('SELECT check_in FROM attendance WHERE user_email=? AND date=?').get(email, today);
    if(!row || row.check_in) return res.status(400).json({ error: 'Already checked in' });
    db.prepare('UPDATE attendance SET check_in=? WHERE user_email=? AND date=?').run(now, email, today);
  }
  res.json({ ok: true });
});

router.post('/checkout', requireAuth, (req, res) => {
  const email = req.session.user.email;
  const today = todayKey();
  const row = db.prepare('SELECT check_in, check_out FROM attendance WHERE user_email=? AND date=?').get(email, today);
  if(!row || !row.check_in) return res.status(400).json({ error: 'Not checked in' });
  if(row.check_out) return res.status(400).json({ error: 'Already checked out' });
  const now = new Date().toISOString();
  db.prepare('UPDATE attendance SET check_out=? WHERE user_email=? AND date=?').run(now, email, today);
  res.json({ ok: true });
});

module.exports = router;
