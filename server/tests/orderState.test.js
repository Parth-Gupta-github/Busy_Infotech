const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const db = require('../src/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

describe('Order State Machine & Business Rules Tests', () => {
  let waiterToken;
  let menuItemId, testOrderId;

  beforeAll(async () => {
    const waiterRes = await db.query("SELECT id, name, role FROM users WHERE role = 'WAITER' LIMIT 1");
    const waiter = waiterRes.rows[0];
    waiterToken = jwt.sign({ id: waiter.id, name: waiter.name, role: waiter.role }, JWT_SECRET);

    const menuRes = await db.query("SELECT id FROM menu_items LIMIT 1");
    menuItemId = menuRes.rows[0]?.id;

    const tableNum = `JestState-${Date.now().toString().slice(-4)}`;
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({
        table_number: tableNum,
        items: menuItemId ? [{ menu_item_id: menuItemId, quantity: 1 }] : []
      });

    testOrderId = createRes.body.id;
  });

  afterAll(async () => {
    if (testOrderId) {
      await db.query("DELETE FROM order_lines WHERE order_id = $1", [testOrderId]);
      await db.query("DELETE FROM audit_logs WHERE order_id = $1", [testOrderId]);
      await db.query("DELETE FROM orders WHERE id = $1", [testOrderId]);
    }
    if (db.pool) {
      await db.pool.end();
    }
  });

  it('PATCH /api/orders/:id/status - should allow valid transition PLACED -> ACCEPTED', async () => {
    const res = await request(app)
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ status: 'ACCEPTED' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');
  });

  it('PATCH /api/orders/:id/status - should reject invalid jump ACCEPTED -> SERVED (400)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ status: 'SERVED' });

    expect(res.statusCode).toBe(400);
  });

  it('PATCH /api/orders/:id/status - should allow sequential transition ACCEPTED -> PREPARING', async () => {
    const res = await request(app)
      .patch(`/api/orders/${testOrderId}/status`)
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ status: 'PREPARING' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('PREPARING');
  });
});
