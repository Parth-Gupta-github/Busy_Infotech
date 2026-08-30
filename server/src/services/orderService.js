const db = require('../db');

/**
 * Create a new order with initial menu item lines & price snapshots (Goal #2 & Goal #3)
 * - Uses a PostgreSQL transaction (BEGIN / COMMIT / ROLLBACK)
 * - Captures price_at_add snapshot for each order line
 * - Calculates server running total_amount
 * - Creates an initial entry in audit_logs (Goal #9)
 */
async function createOrder({ table_number, notes, created_by_id, items = [] }) {
  if (!table_number || table_number.trim() === '') {
    const error = new Error('Table number is required.');
    error.status = 400;
    throw error;
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN'); // Start transaction

    // 1. Insert Order Row with uppercase status 'PLACED' matching order_status_enum
    const orderRes = await client.query(
      `INSERT INTO orders (table_number, primary_waiter_id, status, notes)
       VALUES ($1, $2, 'PLACED', $3)
       RETURNING *`,
      [table_number.trim(), created_by_id, notes ? notes.trim() : null]
    );

    const newOrder = orderRes.rows[0];

    // 2. Process Order Lines (Goal #3: price_at_add snapshot & special instructions)
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const { menu_item_id, quantity = 1, special_instructions } = item;

        if (!menu_item_id) continue;

        // Fetch current menu item price and availability
        const menuRes = await client.query(
          `SELECT id, name, price, available, archived FROM menu_items WHERE id = $1`,
          [menu_item_id]
        );

        if (menuRes.rowCount === 0) {
          const error = new Error(`Menu item with ID ${menu_item_id} not found.`);
          error.status = 404;
          throw error;
        }

        const menuItem = menuRes.rows[0];

        if (!menuItem.available || menuItem.archived) {
          const error = new Error(`Dish "${menuItem.name}" is currently out of stock or archived.`);
          error.status = 400;
          throw error;
        }

        const priceAtAdd = parseFloat(menuItem.price);
        const lineQty = parseInt(quantity, 10) || 1;

        // Insert into order_lines capturing price_at_add snapshot
        await client.query(
          `INSERT INTO order_lines (order_id, menu_item_id, quantity, price_at_add, special_instructions)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newOrder.id,
            menuItem.id,
            lineQty,
            priceAtAdd,
            special_instructions ? special_instructions.trim() : null
          ]
        );
      }
    }

    // 3. Insert Initial Audit Log (Goal #9 Requirement matching schema: user_id & JSONB details)
    await client.query(
      `INSERT INTO audit_logs (order_id, user_id, action, details)
       VALUES ($1, $2, 'ORDER_CREATED', $3)`,
      [
        newOrder.id,
        created_by_id,
        JSON.stringify({ message: `Order created for ${newOrder.table_number}`, itemCount: items.length })
      ]
    );

    await client.query('COMMIT'); // Commit transaction
    return getOrderById(newOrder.id);

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on failure
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get single order by ID with primary waiter details and order lines
 */
async function getOrderById(id) {
  const orderRes = await db.query(
    `SELECT 
       o.*, 
       u.name as primary_waiter_name, 
       u.email as primary_waiter_email,
       COALESCE((
         SELECT SUM(ol.quantity * ol.price_at_add) 
         FROM order_lines ol 
         WHERE ol.order_id = o.id AND ol.voided = false
       ), 0) as total_amount
     FROM orders o
     JOIN users u ON o.primary_waiter_id = u.id
     WHERE o.id = $1`,
    [id]
  );

  if (orderRes.rowCount === 0) {
    const error = new Error('Order not found.');
    error.status = 404;
    throw error;
  }

  const order = orderRes.rows[0];

  // Fetch order lines for this order
  const linesRes = await db.query(
    `SELECT ol.*, mi.name as item_name
     FROM order_lines ol
     JOIN menu_items mi ON ol.menu_item_id = mi.id
     WHERE ol.order_id = $1
     ORDER BY ol.created_at ASC`,
    [id]
  );

  order.lines = linesRes.rows;
  return order;
}

/**
 * Get Paginated & Filtered Orders (Goal #6)
 */
async function getOrders({
  search = '',
  status = '',
  waiterId = '',
  includeArchived = false,
  page = 1,
  limit = 10,
  sort = 'created_at',
  order = 'DESC'
}) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const offset = (pageNum - 1) * limitNum;

  const whereConditions = [];
  const queryParams = [];
  let paramIndex = 1;

  if (!includeArchived) {
    whereConditions.push(`o.archived = false`);
  }

  if (search && search.trim() !== '') {
    whereConditions.push(`o.table_number ILIKE $${paramIndex}`);
    queryParams.push(`%${search.trim()}%`);
    paramIndex++;
  }

  if (status && status.trim() !== '' && status !== 'ALL') {
    whereConditions.push(`o.status = $${paramIndex}`);
    queryParams.push(status.trim().toUpperCase());
    paramIndex++;
  }

  if (waiterId && waiterId.trim() !== '') {
    whereConditions.push(`(o.primary_waiter_id = $${paramIndex} OR EXISTS (
      SELECT 1 FROM order_collaborators oc WHERE oc.order_id = o.id AND oc.waiter_id = $${paramIndex}
    ))`);
    queryParams.push(waiterId.trim());
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(DISTINCT o.id) as total
    FROM orders o
    ${whereClause}
  `;
  const countRes = await db.query(countQuery, queryParams);
  const totalCount = parseInt(countRes.rows[0].total, 10);

  const validSorts = ['created_at', 'table_number', 'status'];
  const sortColumn = validSorts.includes(sort) ? `o.${sort}` : 'o.created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const dataQuery = `
    SELECT 
      o.*, 
      u.name as primary_waiter_name, 
      u.email as primary_waiter_email,
      (SELECT COUNT(*) FROM order_lines ol WHERE ol.order_id = o.id) as item_count,
      COALESCE((
        SELECT SUM(ol.quantity * ol.price_at_add) 
        FROM order_lines ol 
        WHERE ol.order_id = o.id AND ol.voided = false
      ), 0) as total_amount
    FROM orders o
    JOIN users u ON o.primary_waiter_id = u.id
    ${whereClause}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataParams = [...queryParams, limitNum, offset];
  const dataRes = await db.query(dataQuery, dataParams);

  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    orders: dataRes.rows,
    pagination: {
      totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages
    }
  };
}

/**
 * Soft-delete (archive) or restore an order
 */
async function setOrderArchiveStatus(id, archived) {
  await getOrderById(id);

  const result = await db.query(
    `UPDATE orders
     SET archived = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [archived, id]
  );

  return result.rows[0];
}

module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  setOrderArchiveStatus
};
