const fs = require('fs');
const path = require('path');

beforeAll(() => {
  // Point DB to a temporary file for tests if supported by db.js in future.
  process.env.NODE_ENV = 'test';
  // Ensure public dir exists for static file tests
  const pub = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });
});

afterAll(() => {
  // Nothing to cleanup; DB uses better-sqlite3 in project data/. We avoid mutations in tests.
});
