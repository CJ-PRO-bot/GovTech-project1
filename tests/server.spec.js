const request = require('supertest');
const path = require('path');

process.env.NODE_ENV = 'test';
const app = require('../server/server');

function withAgent() {
  return request.agent(app); // keep session cookies
}

describe('Server validity', () => {
  test('GET / serves index.html for non-API route', async () => {
    const res = await withAgent().get('/');
    // Express static + sendFile should default to 200
    expect([200, 304]).toContain(res.status);
    // content type likely html
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /api/auth/me returns { user: null } when not logged in', async () => {
    const res = await withAgent().get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  test('Auth signup -> me -> logout lifecycle works', async () => {
    const agent = withAgent();
    const email = `test_${Date.now()}@example.com`;

    // signup
    let res = await agent
      .post('/api/auth/signup')
      .send({ name: 'Test User', role: 'tester', email, password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // me
    res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.email).toBe(email);

    // logout
    res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // me after logout
    res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  test('Login fails with wrong password', async () => {
    const agent = withAgent();
    const email = `wrongpass_${Date.now()}@example.com`;

    await agent
      .post('/api/auth/signup')
      .send({ name: 'User', role: '', email, password: 'correctPwd' })
      .expect(200);

    await agent
      .post('/api/auth/logout')
      .expect(200);

    const res = await agent
      .post('/api/auth/login')
      .send({ email, password: 'badPwd' });
    expect(res.status).toBe(401);
  });

  test('Protected routes require auth', async () => {
    const agent = withAgent();

    let res = await agent.get('/api/users/me');
    expect(res.status).toBe(401);

    res = await agent.get('/api/attendance');
    expect(res.status).toBe(401);
  });

  test('Attendance flow: checkin then checkout', async () => {
    const agent = withAgent();
    const email = `att_${Date.now()}@example.com`;

    // signup and remain logged in
    await agent
      .post('/api/auth/signup')
      .send({ name: 'Att User', role: '', email, password: 'secret123' })
      .expect(200);

    // start with empty attendance
    let res = await agent.get('/api/attendance');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);

    // checkin
    res = await agent.post('/api/attendance/checkin');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // cannot checkin twice
    res = await agent.post('/api/attendance/checkin');
    expect(res.status).toBe(400);

    // checkout
    res = await agent.post('/api/attendance/checkout');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // cannot checkout twice
    res = await agent.post('/api/attendance/checkout');
    expect(res.status).toBe(400);
  });
});
