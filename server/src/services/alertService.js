const db = require('../db');

// Get active slow orders open longer than thresholdMinutes (default 15 mins) that are not currently suppressed by an acknowledgment within suppressMinutes (default 10 mins)
async function getSlowOrders(thresholdMinutes = 15, suppressMinutes = 10) {
  const result = await db.query(
    `SELECT 
       o.id as order_id,
       o.table_number,
       o.status,
       o.created_at,
       u.name as primary_waiter_name,
       u.email as primary_waiter_email,
       ROUND(EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 60) as elapsed_minutes,
       COALESCE((
         SELECT SUM(ol.quantity * ol.price_at_add)
         FROM order_lines ol
         WHERE ol.order_id = o.id AND ol.voided = false
       ), 0) as total_amount
     FROM orders o
     JOIN users u ON o.primary_waiter_id = u.id
     WHERE o.archived = false
       AND o.status IN ('PLACED', 'ACCEPTED', 'PREPARING')
       AND o.created_at <= NOW() - ($1 || ' minutes')::INTERVAL
       AND NOT EXISTS (
         SELECT 1 FROM alert_acknowledgments aa
         WHERE aa.order_id = o.id
           AND aa.acknowledged_at >= NOW() - ($2 || ' minutes')::INTERVAL
       )
     ORDER BY o.created_at ASC`,
    [thresholdMinutes, suppressMinutes]
  );

  return {
    slowOrders: result.rows.map(r => ({
      orderId: r.order_id,
      tableNumber: r.table_number,
      status: r.status,
      createdAt: r.created_at,
      primaryWaiterName: r.primary_waiter_name,
      primaryWaiterEmail: r.primary_waiter_email,
      elapsedMinutes: parseInt(r.elapsed_minutes, 10) || 0,
      totalAmount: parseFloat(r.total_amount) || 0
    })),
    count: result.rowCount
  };
}

// Acknowledge a slow order alert for a user, suppressing re-alerts for suppressMinutes (default 10 mins)
async function acknowledgeSlowOrder(orderId, userId) {
  const orderCheck = await db.query(
    `SELECT id, table_number, status FROM orders WHERE id = $1 AND archived = false`,
    [orderId]
  );

  if (orderCheck.rowCount === 0) {
    const error = new Error('Order not found.');
    error.status = 404;
    throw error;
  }

  const userCheck = await db.query(
    `SELECT id, name FROM users WHERE id = $1`,
    [userId]
  );

  if (userCheck.rowCount === 0) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const ackRes = await db.query(
    `INSERT INTO alert_acknowledgments (order_id, user_id)
     VALUES ($1, $2)
     RETURNING *`,
    [orderId, userId]
  );

  await db.query(
    `INSERT INTO audit_logs (order_id, user_id, action, details)
     VALUES ($1, $2, 'STATUS_CHANGED', $3)`,
    [
      orderId,
      userId,
      JSON.stringify({
        message: `Acknowledged slow-order alert for Table ${orderCheck.rows[0].table_number} (suppressed for 10 mins)`
      })
    ]
  );

  return ackRes.rows[0];
}

module.exports = {
  getSlowOrders,
  acknowledgeSlowOrder
};
