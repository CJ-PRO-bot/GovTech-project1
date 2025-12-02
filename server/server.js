const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');

// Initialize DB (creates data dir and tables)
require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);

// Serve static files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Express v5-safe catch-all for SPA client routes
app.get(/.*/, (req, res) => {
  // Only handle non-API routes here
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
