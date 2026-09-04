const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

describe('Authentication API Integration Tests', () => {
  afterAll(async () => {
    // Close database pool connection after all tests finish
    if (db.pool) {
      await db.pool.end();
    }
  });

  it('POST /api/auth/login - should fail with 400 if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'waiter1@restaurant.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('POST /api/auth/login - should fail with 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email-format', password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('POST /api/auth/login - should succeed with 200 for valid waiter credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'waiter1@restaurant.com', password: 'waiter123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('role', 'WAITER');
  });

  it('GET /api/auth/me - should fail with 401 if unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});
