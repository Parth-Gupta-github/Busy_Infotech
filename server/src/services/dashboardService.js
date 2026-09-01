const db = require('../db');

// Get aggregated dashboard statistics, breakdowns, and 14-day trends (Goal #8)
async function getDashboardStats() {
  // 1. Headline KPI Stat Cards
  const kpiRes = await db.query(`
    SELECT 
      (SELECT COUNT(*) FROM orders WHERE archived = false AND status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY')) as open_orders,
      (SELECT COUNT(*) FROM orders WHERE archived = false AND created_at >= CURRENT_DATE) as placed_today,
      (SELECT COUNT(*) FROM orders WHERE archived = false AND status = 'SERVED' AND updated_at >= CURRENT_DATE) as served_today,
      (SELECT COALESCE(SUM(ol.quantity * ol.price_at_add), 0)
       FROM orders o
       JOIN order_lines ol ON ol.order_id = o.id
       WHERE o.archived = false AND o.status = 'SERVED' AND o.updated_at >= CURRENT_DATE AND ol.voided = false) as revenue_today
  `);

  const kpis = {
    openOrders: parseInt(kpiRes.rows[0].open_orders, 10) || 0,
    placedToday: parseInt(kpiRes.rows[0].placed_today, 10) || 0,
    servedToday: parseInt(kpiRes.rows[0].served_today, 10) || 0,
    revenueToday: parseFloat(kpiRes.rows[0].revenue_today) || 0
  };

  // 2. Status Breakdown
  const statusRes = await db.query(`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE archived = false
    GROUP BY status
    ORDER BY count DESC
  `);

  const statusBreakdown = statusRes.rows.map(r => ({
    status: r.status,
    count: parseInt(r.count, 10)
  }));

  // 3. Waiter Performance Breakdown (Served Revenue & Pending Ongoing Revenue)
  const waiterRes = await db.query(`
    SELECT 
      u.id as waiter_id,
      u.name as waiter_name,
      COUNT(DISTINCT o.id) as order_count,
      COUNT(DISTINCT CASE WHEN o.status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY') THEN o.id END) as active_order_count,
      COALESCE(SUM(CASE WHEN ol.voided = false AND o.status = 'SERVED' THEN ol.quantity * ol.price_at_add ELSE 0 END), 0) as served_revenue,
      COALESCE(SUM(CASE WHEN ol.voided = false AND o.status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY') THEN ol.quantity * ol.price_at_add ELSE 0 END), 0) as pending_revenue
    FROM users u
    JOIN orders o ON o.primary_waiter_id = u.id
    LEFT JOIN order_lines ol ON ol.order_id = o.id
    WHERE o.archived = false
    GROUP BY u.id, u.name
    ORDER BY served_revenue DESC, pending_revenue DESC
  `);

  const waiterPerformance = waiterRes.rows.map(r => ({
    waiterId: r.waiter_id,
    waiterName: r.waiter_name,
    orderCount: parseInt(r.order_count, 10),
    activeOrderCount: parseInt(r.active_order_count, 10),
    servedRevenue: parseFloat(r.served_revenue),
    pendingRevenue: parseFloat(r.pending_revenue),
    totalRevenue: parseFloat(r.served_revenue)
  }));

  // 4. 14-Day Served Orders & Revenue Trend Line Data (Goal #8)
  const trendRes = await db.query(`
    SELECT 
      TO_CHAR(d.day, 'Mon DD') as date_label,
      d.day::date as date_val,
      COALESCE(COUNT(DISTINCT o.id), 0) as served_count,
      COALESCE(SUM(CASE WHEN ol.voided = false THEN ol.quantity * ol.price_at_add ELSE 0 END), 0) as daily_revenue
    FROM generate_series(
      CURRENT_DATE - INTERVAL '13 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) d(day)
    LEFT JOIN orders o ON DATE_TRUNC('day', o.updated_at) = d.day AND o.status = 'SERVED' AND o.archived = false
    LEFT JOIN order_lines ol ON ol.order_id = o.id
    GROUP BY d.day
    ORDER BY d.day ASC
  `);

  const trendData = trendRes.rows.map(r => ({
    date: r.date_label,
    servedOrders: parseInt(r.served_count, 10),
    revenue: parseFloat(r.daily_revenue)
  }));

  return {
    kpis,
    statusBreakdown,
    waiterPerformance,
    trendData
  };
}

module.exports = {
  getDashboardStats
};
