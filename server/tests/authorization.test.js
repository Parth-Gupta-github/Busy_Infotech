const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const db = require('../src/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

describe('Resource-Level Authorization & BOLA Prevention Tests', () => {
  let waiterA, waiterB, manager;
  let tokenA, tokenB, tokenManager;
  let menuItemId, testOrderId;

  beforeAll(async () => {
    // 1. Fetch default test users from DB
    const waiters = await db.query("SELECT id, name, role FROM users WHERE role = 'WAITER' ORDER BY id ASC LIMIT 2");
    const managers = await db.query("SELECT id, name, role FROM users WHERE role = 'MANAGER' ORDER BY id ASC LIMIT 1");

    waiterA = waiters.rows[0];
    waiterB = waiters.rows[1];
    manager = managers.rows[0];

    tokenA = jwt.sign({ id: waiterA.id, name: waiterA.name, role: waiterA.role }, JWT_SECRET);
    tokenB = jwt.sign({ id: waiterB.id, name: waiterB.name, role: waiterB.role }, JWT_SECRET);
    tokenManager = jwt.sign({ id: manager.id, name: manager.name, role: manager.role }, JWT_SECRET);

    // 2. Fetch a menu item
    const menuRes = await db.query("SELECT id FROM menu_items LIMIT 1");
    menuItemId = menuRes.rows[0]?.id;

    // 3. Waiter A creates an order
    const tableNum = `JestAuth-${Date.now().toString().slice(-4)}`;
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        table_number: tableNum,
        items: menuItemId ? [{ menu_item_id: menuItemId, quantity: 1 }] : []
      });

    testOrderId = createRes.body.id;
  });

  afterAll(async () => {
    // Clean up test order
    if (testOrderId) {
      await db.query("DELETE FROM order_collaborators WHERE order_id = $1", [testOrderId]);
      await db.query("DELETE FROM order_lines WHERE order_id = $1", [testOrderId]);
      await db.query("DELETE FROM audit_logs WHERE order_id = $1", [testOrderId]);
      await db.query("DELETE FROM orders WHERE id = $1", [testOrderId]);
    }
    if (db.pool) {
      await db.pool.end();
    }
  });

  it('Unrelated Waiter B should be blocked from GET Waiter A order (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .get(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('Unrelated Waiter B should be blocked from adding dish lines to Waiter A order (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .post(`/api/orders/${testOrderId}/lines`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ menu_item_id: menuItemId, quantity: 1 });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('Primary Waiter A should have full access to GET order (200 OK)', async () => {
    const res = await request(app)
      .get(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(testOrderId);
  });

  it('Primary Waiter A can add Waiter B as collaborator (200 OK)', async () => {
    const res = await request(app)
      .post(`/api/orders/${testOrderId}/collaborators`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ waiter_id: waiterB.id });

    expect(res.statusCode).toBe(200);
  });

  it('Collaborator Waiter B can now view order (200 OK)', async () => {
    const res = await request(app)
      .get(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(200);
  });

  it('Collaborator Waiter B is blocked from managing collaborators (403 Primary-only)', async () => {
    const res = await request(app)
      .post(`/api/orders/${testOrderId}/collaborators`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ waiter_id: waiterA.id });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('Manager has full access to view order (200 OK)', async () => {
    const res = await request(app)
      .get(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${tokenManager}`);

    expect(res.statusCode).toBe(200);
  });
});
