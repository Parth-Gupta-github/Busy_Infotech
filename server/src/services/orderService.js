const db = require('../db');

// Order state machine transition rules
const ALLOWED_TRANSITIONS = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
  SERVED: [],
  CANCELLED: []
};

// Create a new order
async function createOrder({ table_number, notes, created_by_id, items = [] }) {
  if (!table_number || table_number.trim() === '') {
    const error = new Error('Table number is required.');
    error.status = 400;
    throw error;
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('An order must contain at least 1 dish item before placing.');
    error.status = 400;
    throw error;
  }

  const normalizedTable = table_number.trim();
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const activeCheck = await client.query(
      `SELECT id, status FROM orders 
       WHERE table_number = $1 AND archived = false AND status NOT IN ('SERVED', 'CANCELLED')`,
      [normalizedTable]
    );

    if (activeCheck.rowCount > 0) {
      const error = new Error(`An active order already exists for ${normalizedTable}. Please add dishes to the existing order instead of creating a duplicate.`);
      error.status = 400;
      throw error;
    }

    const orderRes = await client.query(
      `INSERT INTO orders (table_number, primary_waiter_id, status, notes)
       VALUES ($1, $2, 'PLACED', $3)
       RETURNING *`,
      [normalizedTable, created_by_id, notes ? notes.trim() : null]
    );

    const newOrder = orderRes.rows[0];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const { menu_item_id, quantity = 1, special_instructions } = item;
        if (!menu_item_id) continue;

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

        await client.query(
          `INSERT INTO order_lines (order_id, menu_item_id, quantity, price_at_add, special_instructions)
           VALUES ($1, $2, $3, $4, $5)`,
          [newOrder.id, menuItem.id, lineQty, priceAtAdd, special_instructions ? special_instructions.trim() : null]
        );
      }
    }

    await client.query(
      `INSERT INTO audit_logs (order_id, user_id, action, details)
       VALUES ($1, $2, 'ORDER_CREATED', $3)`,
      [
        newOrder.id,
        created_by_id,
        JSON.stringify({ message: `Order created for ${newOrder.table_number}`, itemCount: items.length })
      ]
    );

    await client.query('COMMIT');
    return getOrderById(newOrder.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Add a new dish line to an existing active order
async function addOrderLine({ order_id, menu_item_id, quantity = 1, special_instructions, actor_id }) {
  if (!order_id || !menu_item_id) {
    const error = new Error('Order ID and Menu Item ID are required.');
    error.status = 400;
    throw error;
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [order_id]
    );

    if (orderRes.rowCount === 0) {
      const error = new Error('Order not found.');
      error.status = 404;
      throw error;
    }

    const order = orderRes.rows[0];
    if (order.archived || ['SERVED', 'CANCELLED'].includes(order.status)) {
      const error = new Error(`Cannot add dishes to order in status "${order.status}".`);
      error.status = 400;
      throw error;
    }

    const menuRes = await client.query(
      `SELECT id, name, price, available, archived FROM menu_items WHERE id = $1`,
      [menu_item_id]
    );

    if (menuRes.rowCount === 0) {
      const error = new Error('Menu item not found.');
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

    const lineRes = await client.query(
      `INSERT INTO order_lines (order_id, menu_item_id, quantity, price_at_add, special_instructions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [order_id, menuItem.id, lineQty, priceAtAdd, special_instructions ? special_instructions.trim() : null]
    );

    await client.query(
      `INSERT INTO audit_logs (order_id, user_id, action, details)
       VALUES ($1, $2, 'LINE_ADDED', $3)`,
      [
        order_id,
        actor_id,
        JSON.stringify({
          message: `Added ${lineQty}x ${menuItem.name} at ₹${priceAtAdd.toFixed(2)} each`,
          lineId: lineRes.rows[0].id
        })
      ]
    );

    await client.query('COMMIT');
    return getOrderById(order_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Void full or partial order line quantity with mandatory reason
async function voidOrderLine({ order_id, line_id, void_quantity, void_reason, actor_id }) {
  if (!void_reason || void_reason.trim() === '') {
    const error = new Error('Void reason is required when voiding an order line.');
    error.status = 400;
    throw error;
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const lineRes = await client.query(
      `SELECT ol.*, mi.name as item_name
       FROM order_lines ol
       JOIN menu_items mi ON ol.menu_item_id = mi.id
       WHERE ol.id = $1 AND ol.order_id = $2 FOR UPDATE`,
      [line_id, order_id]
    );

    if (lineRes.rowCount === 0) {
      const error = new Error('Order line not found.');
      error.status = 404;
      throw error;
    }

    const line = lineRes.rows[0];
    if (line.voided) {
      const error = new Error('This order line has already been voided.');
      error.status = 400;
      throw error;
    }

    const totalQty = parseInt(line.quantity, 10);
    const voidQty = void_quantity !== undefined ? parseInt(void_quantity, 10) : totalQty;

    if (isNaN(voidQty) || voidQty < 1 || voidQty > totalQty) {
      const error = new Error(`Void quantity must be between 1 and ${totalQty}.`);
      error.status = 400;
      throw error;
    }

    if (voidQty >= totalQty) {
      await client.query(
        `UPDATE order_lines
         SET voided = true, void_reason = $1, updated_at = NOW()
         WHERE id = $2`,
        [void_reason.trim(), line_id]
      );
    } else {
      const remainingQty = totalQty - voidQty;

      await client.query(
        `UPDATE order_lines
         SET quantity = $1, updated_at = NOW()
         WHERE id = $2`,
        [remainingQty, line_id]
      );

      await client.query(
        `INSERT INTO order_lines (order_id, menu_item_id, quantity, price_at_add, special_instructions, voided, void_reason)
         VALUES ($1, $2, $3, $4, $5, true, $6)`,
        [
          order_id,
          line.menu_item_id,
          voidQty,
          line.price_at_add,
          line.special_instructions,
          void_reason.trim()
        ]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (order_id, user_id, action, details)
       VALUES ($1, $2, 'LINE_VOIDED', $3)`,
      [
        order_id,
        actor_id,
        JSON.stringify({
          message: `Voided ${voidQty}x ${line.item_name} (${totalQty - voidQty} remaining). Reason: ${void_reason.trim()}`,
          lineId: line_id,
          voidedQty: voidQty,
          reason: void_reason.trim()
        })
      ]
    );

    await client.query('COMMIT');
    return getOrderById(order_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Add a waiter as collaborator to an active order (Goal #5)
async function addOrderCollaborator({ order_id, waiter_id, actor_id }) {
  if (!order_id || !waiter_id) {
    const error = new Error('Order ID and Waiter ID are required.');
    error.status = 400;
    throw error;
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [order_id]
    );

    if (orderRes.rowCount === 0) {
      const error = new Error('Order not found.');
      error.status = 404;
      throw error;
    }

    const order = orderRes.rows[0];
    if (order.archived || ['SERVED', 'CANCELLED'].includes(order.status)) {
      const error = new Error('Cannot add collaborators to a completed or archived order.');
      error.status = 400;
      throw error;
    }

    if (order.primary_waiter_id === waiter_id) {
      const error = new Error('Primary waiter cannot be added as a collaborator to their own order.');
      error.status = 400;
      throw error;
    }

    const userRes = await client.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`,
      [waiter_id]
    );

    if (userRes.rowCount === 0) {
      const error = new Error('Waiter user not found.');
      error.status = 404;
      throw error;
    }

    const targetUser = userRes.rows[0];

    const collabRes = await client.query(
      `INSERT INTO order_collaborators (order_id, waiter_id)
       VALUES ($1, $2)
       ON CONFLICT (order_id, waiter_id) DO NOTHING
       RETURNING *`,
      [order_id, waiter_id]
    );

    if (collabRes.rowCount > 0) {
      await client.query(
        `INSERT INTO audit_logs (order_id, user_id, action, details)
         VALUES ($1, $2, 'COLLABORATOR_ADDED', $3)`,
        [
          order_id,
          actor_id,
          JSON.stringify({
            message: `Added ${targetUser.name} (${targetUser.email}) as collaborator`,
            collaboratorId: waiter_id
          })
        ]
      );
    }

    await client.query('COMMIT');
    return getOrderById(order_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Remove a collaborator from an order (Goal #5)
async function removeOrderCollaborator({ order_id, waiter_id, actor_id }) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      `SELECT name, email FROM users WHERE id = $1`,
      [waiter_id]
    );

    const userName = userRes.rowCount > 0 ? userRes.rows[0].name : 'Waiter';

    const deleteRes = await client.query(
      `DELETE FROM order_collaborators
       WHERE order_id = $1 AND waiter_id = $2
       RETURNING *`,
      [order_id, waiter_id]
    );

    if (deleteRes.rowCount > 0) {
      await client.query(
        `INSERT INTO audit_logs (order_id, user_id, action, details)
         VALUES ($1, $2, 'COLLABORATOR_REMOVED', $3)`,
        [
          order_id,
          actor_id,
          JSON.stringify({
            message: `Removed ${userName} from order collaborators`,
            collaboratorId: waiter_id
          })
        ]
      );
    }

    await client.query('COMMIT');
    return getOrderById(order_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Get all collaborators for an order
async function getOrderCollaborators(orderId) {
  const result = await db.query(
    `SELECT 
       oc.id as collaboration_id,
       oc.created_at as collaborated_at,
       u.id as waiter_id,
       u.name as waiter_name,
       u.email as waiter_email
     FROM order_collaborators oc
     JOIN users u ON oc.waiter_id = u.id
     WHERE oc.order_id = $1
     ORDER BY oc.created_at ASC`,
    [orderId]
  );
  return result.rows;
}

// Get single order by ID
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

  const linesRes = await db.query(
    `SELECT ol.*, mi.name as item_name
     FROM order_lines ol
     JOIN menu_items mi ON ol.menu_item_id = mi.id
     WHERE ol.order_id = $1
     ORDER BY ol.created_at ASC`,
    [id]
  );

  const collabsRes = await db.query(
    `SELECT 
       oc.id as collaboration_id,
       u.id as waiter_id,
       u.name as waiter_name,
       u.email as waiter_email
     FROM order_collaborators oc
     JOIN users u ON oc.waiter_id = u.id
     WHERE oc.order_id = $1`,
    [id]
  );

  order.lines = linesRes.rows;
  order.collaborators = collabsRes.rows;
  return order;
}

// Get paginated and filtered orders
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

// Soft-delete or restore an order
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

// Update order status
async function updateOrderStatus(id, newStatus, actorId) {
  const targetStatus = (newStatus || '').toUpperCase();
  const validStatuses = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];

  if (!validStatuses.includes(targetStatus)) {
    const error = new Error(`Invalid status "${newStatus}". Must be one of: ${validStatuses.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (orderRes.rowCount === 0) {
      const error = new Error('Order not found.');
      error.status = 404;
      throw error;
    }

    const currentOrder = orderRes.rows[0];
    const oldStatus = currentOrder.status;

    if (oldStatus === targetStatus) {
      await client.query('COMMIT');
      return currentOrder;
    }

    const allowedNext = ALLOWED_TRANSITIONS[oldStatus] || [];
    if (!allowedNext.includes(targetStatus)) {
      let msg = `Cannot transition order status from ${oldStatus} to ${targetStatus}.`;
      if (targetStatus === 'CANCELLED') {
        msg = `Cannot cancel order in status "${oldStatus}". Cancellation is ONLY allowed when status is PLACED or ACCEPTED.`;
      }
      const error = new Error(msg);
      error.status = 400;
      throw error;
    }

    if (['ACCEPTED', 'PREPARING', 'READY', 'SERVED'].includes(targetStatus)) {
      const linesCountRes = await client.query(
        `SELECT COUNT(*) as count FROM order_lines WHERE order_id = $1 AND voided = false`,
        [id]
      );
      const activeLinesCount = parseInt(linesCountRes.rows[0].count, 10) || 0;
      if (activeLinesCount === 0) {
        const error = new Error(`Cannot process or accept an empty order. Please add at least 1 dish line first.`);
        error.status = 400;
        throw error;
      }
    }

    const updatedRes = await client.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [targetStatus, id]
    );

    const updatedOrder = updatedRes.rows[0];

    await client.query(
      `INSERT INTO audit_logs (order_id, user_id, action, old_status, new_status, details)
       VALUES ($1, $2, 'STATUS_CHANGED', $3, $4, $5)`,
      [
        id,
        actorId,
        oldStatus,
        targetStatus,
        JSON.stringify({
          message: `Order status changed from ${oldStatus} to ${targetStatus}`
        })
      ]
    );

    await client.query('COMMIT');
    return updatedOrder;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Get order audit logs
async function getOrderAuditLogs(orderId) {
  const result = await db.query(
    `SELECT 
       al.*, 
       u.name as actor_name, 
       u.role as actor_role
     FROM audit_logs al
     JOIN users u ON al.user_id = u.id
     WHERE al.order_id = $1
     ORDER BY al.created_at ASC`,
    [orderId]
  );
  return result.rows;
}

// Export orders data as CSV text string (Goal #7 Part B)
async function exportOrdersCSV(options = {}) {
  const { search = '', status = '', waiterId = '', date = '' } = options;
  const whereConditions = ['o.archived = false'];
  const queryParams = [];
  let paramIndex = 1;

  if (search && search.trim()) {
    whereConditions.push(`o.table_number ILIKE $${paramIndex}`);
    queryParams.push(`%${search.trim()}%`);
    paramIndex++;
  }

  if (status && status.trim() && status.toUpperCase() !== 'ALL') {
    whereConditions.push(`o.status = $${paramIndex}`);
    queryParams.push(status.trim().toUpperCase());
    paramIndex++;
  }

  if (waiterId && waiterId.trim()) {
    whereConditions.push(
      `(o.primary_waiter_id = $${paramIndex} OR EXISTS (
         SELECT 1 FROM order_collaborators oc 
         WHERE oc.order_id = o.id AND oc.waiter_id = $${paramIndex}
       ))`
    );
    queryParams.push(waiterId.trim());
    paramIndex++;
  }

  if (date && date.trim()) {
    if (date.trim().toLowerCase() === 'today') {
      whereConditions.push(`o.created_at >= CURRENT_DATE`);
    } else if (date.trim().toLowerCase() !== 'all') {
      whereConditions.push(`DATE_TRUNC('day', o.created_at) = $${paramIndex}::date`);
      queryParams.push(date.trim());
      paramIndex++;
    }
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const query = `
    SELECT 
      o.id as order_id,
      o.table_number,
      o.status,
      u.name as primary_waiter_name,
      u.email as primary_waiter_email,
      COUNT(ol.id) as items_count,
      o.created_at,
      COALESCE(SUM(CASE WHEN ol.voided = false THEN ol.quantity * ol.price_at_add ELSE 0 END), 0) as total_amount
    FROM orders o
    JOIN users u ON o.primary_waiter_id = u.id
    LEFT JOIN order_lines ol ON ol.order_id = o.id
    ${whereClause}
    GROUP BY o.id, o.table_number, o.status, u.name, u.email, o.created_at
    ORDER BY o.created_at DESC
  `;

  const result = await db.query(query, queryParams);

  const headers = ['Order ID', 'Table Number', 'Status', 'Primary Waiter', 'Items Count', 'Created At', 'Total Amount (INR)'];
  const rows = result.rows.map(r => [
    `"${r.order_id}"`,
    `"${r.table_number}"`,
    `"${r.status}"`,
    `"${r.primary_waiter_name}"`,
    r.items_count,
    `"${new Date(r.created_at).toISOString()}"`,
    parseFloat(r.total_amount).toFixed(2)
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csvContent;
}

module.exports = {
  createOrder,
  addOrderLine,
  voidOrderLine,
  addOrderCollaborator,
  removeOrderCollaborator,
  getOrderCollaborators,
  getOrderById,
  getOrders,
  setOrderArchiveStatus,
  updateOrderStatus,
  getOrderAuditLogs,
  exportOrdersCSV
};
