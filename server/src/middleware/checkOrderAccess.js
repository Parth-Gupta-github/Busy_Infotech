const db = require('../db');

/**
 * Middleware factory for resource-level order access authorization (BOLA / IDOR prevention).
 * 
 * Authorization Matrix:
 * 1. MANAGER has full access to all orders.
 * 2. Primary Waiter (order.primary_waiter_id === req.user.id) has full access.
 * 3. Assigned Collaborator (user in order_collaborators table) has access unless primaryOnly is true.
 * 4. Unrelated Waiter receives 403 FORBIDDEN.
 * 5. Non-existent order receives 404 NOT_FOUND.
 * 
 * @param {Object} [options]
 * @param {boolean} [options.primaryOnly=false] - If true, only Primary Waiter or Manager can perform the action
 */
function checkOrderAccess(options = {}) {
  const { primaryOnly = false } = options;

  return async (req, res, next) => {
    try {
      const orderId = req.params.id;
      if (!orderId) {
        return next();
      }

      const user = req.user;
      if (!user) {
        const error = new Error('Authentication required.');
        error.status = 401;
        error.code = 'UNAUTHORIZED';
        return next(error);
      }

      // MANAGER role bypasses order ownership checks
      if (user.role === 'MANAGER') {
        return next();
      }

      // Query database for order existence & primary waiter
      const orderRes = await db.query(
        'SELECT id, primary_waiter_id FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        const error = new Error(`Order with ID ${orderId} not found.`);
        error.status = 404;
        error.code = 'NOT_FOUND';
        return next(error);
      }

      const order = orderRes.rows[0];

      // Primary Waiter has full access
      if (order.primary_waiter_id === user.id) {
        return next();
      }

      // If action requires Primary Waiter or Manager (e.g., adding/removing collaborators)
      if (primaryOnly) {
        const error = new Error('Access denied. Only the primary waiter or a manager can manage collaborators for this order.');
        error.status = 403;
        error.code = 'FORBIDDEN';
        return next(error);
      }

      // Check if user is an assigned collaborator for this order
      const collabRes = await db.query(
        'SELECT 1 FROM order_collaborators WHERE order_id = $1 AND waiter_id = $2',
        [orderId, user.id]
      );

      if (collabRes.rows.length > 0) {
        return next();
      }

      // Unrelated Waiter -> Deny access
      const error = new Error('Access denied. You are not assigned to this order.');
      error.status = 403;
      error.code = 'FORBIDDEN';
      return next(error);

    } catch (err) {
      next(err);
    }
  };
}

module.exports = { checkOrderAccess };
