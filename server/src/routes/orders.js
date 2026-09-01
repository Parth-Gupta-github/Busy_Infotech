const express = require('express');
const { body, query, validationResult } = require('express-validator');
const orderService = require('../services/orderService');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

// Input validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// Create a new order
router.post(
  '/',
  authenticateToken,
  [
    body('table_number').trim().notEmpty().withMessage('Table number is required.'),
    body('notes').optional().trim(),
    body('items').optional().isArray().withMessage('Items must be an array of order lines.'),
    validate
  ],
  async (req, res, next) => {
    try {
      const newOrder = await orderService.createOrder({
        table_number: req.body.table_number,
        notes: req.body.notes,
        created_by_id: req.user.id,
        items: req.body.items || []
      });
      res.status(201).json(newOrder);
    } catch (err) {
      next(err);
    }
  }
);

// Export orders data as downloadable CSV file (Goal #7 Part B)
router.get('/export/csv', authenticateToken, async (req, res, next) => {
  try {
    const { search, status, waiterId, date } = req.query;
    const csvContent = await orderService.exportOrdersCSV({ search, status, waiterId, date });

    const todayStr = date || new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="daily-orders-${todayStr}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

// Add a new dish line to an existing active order
router.post(
  '/:id/lines',
  authenticateToken,
  [
    body('menu_item_id').trim().notEmpty().withMessage('Menu item ID is required.'),
    body('quantity').optional().isInt({ min: 1 }).toInt(),
    body('special_instructions').optional().trim(),
    validate
  ],
  async (req, res, next) => {
    try {
      const updatedOrder = await orderService.addOrderLine({
        order_id: req.params.id,
        menu_item_id: req.body.menu_item_id,
        quantity: req.body.quantity || 1,
        special_instructions: req.body.special_instructions,
        actor_id: req.user.id
      });
      res.json(updatedOrder);
    } catch (err) {
      next(err);
    }
  }
);

// Void full or partial order line quantity with mandatory reason
router.patch(
  '/:id/lines/:lineId/void',
  authenticateToken,
  [
    body('void_reason').trim().notEmpty().withMessage('Void reason is required when voiding an order line.'),
    body('void_quantity').optional().isInt({ min: 1 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const updatedOrder = await orderService.voidOrderLine({
        order_id: req.params.id,
        line_id: req.params.lineId,
        void_quantity: req.body.void_quantity,
        void_reason: req.body.void_reason,
        actor_id: req.user.id
      });
      res.json(updatedOrder);
    } catch (err) {
      next(err);
    }
  }
);

// Add a collaborator waiter to an active order (Goal #5)
router.post(
  '/:id/collaborators',
  authenticateToken,
  [
    body('waiter_id').trim().notEmpty().withMessage('Waiter ID is required.'),
    validate
  ],
  async (req, res, next) => {
    try {
      const updatedOrder = await orderService.addOrderCollaborator({
        order_id: req.params.id,
        waiter_id: req.body.waiter_id,
        actor_id: req.user.id
      });
      res.json(updatedOrder);
    } catch (err) {
      next(err);
    }
  }
);

// Remove a collaborator waiter from an order (Goal #5)
router.delete(
  '/:id/collaborators/:waiterId',
  authenticateToken,
  async (req, res, next) => {
    try {
      const updatedOrder = await orderService.removeOrderCollaborator({
        order_id: req.params.id,
        waiter_id: req.params.waiterId,
        actor_id: req.user.id
      });
      res.json(updatedOrder);
    } catch (err) {
      next(err);
    }
  }
);

// Get all collaborators for an order (Goal #5)
router.get(
  '/:id/collaborators',
  authenticateToken,
  async (req, res, next) => {
    try {
      const collaborators = await orderService.getOrderCollaborators(req.params.id);
      res.json(collaborators);
    } catch (err) {
      next(err);
    }
  }
);

// List paginated and filtered orders
router.get(
  '/',
  authenticateToken,
  [
    query('search').optional().trim(),
    query('status').optional().trim(),
    query('waiterId').optional().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate
  ],
  async (req, res, next) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const result = await orderService.getOrders({
        search: req.query.search,
        status: req.query.status,
        waiterId: req.query.waiterId,
        includeArchived,
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sort: req.query.sort || 'created_at',
        order: req.query.order || 'DESC'
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Get single order by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Update order status enforcing state machine rules
router.patch(
  '/:id/status',
  authenticateToken,
  [
    body('status').trim().notEmpty().withMessage('Status is required.'),
    validate
  ],
  async (req, res, next) => {
    try {
      const updatedOrder = await orderService.updateOrderStatus(
        req.params.id,
        req.body.status,
        req.user.id
      );
      res.json(updatedOrder);
    } catch (err) {
      next(err);
    }
  }
);

// Get order audit log history
router.get('/:id/audit', authenticateToken, async (req, res, next) => {
  try {
    const logs = await orderService.getOrderAuditLogs(req.params.id);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// Soft-delete (archive) or restore an order (Manager Only)
router.patch(
  '/:id/archive',
  authenticateToken,
  requireRole('MANAGER'),
  [
    body('archived').isBoolean().withMessage('Archived field must be a boolean (true/false).'),
    validate
  ],
  async (req, res, next) => {
    try {
      const updatedOrder = await orderService.setOrderArchiveStatus(
        req.params.id,
        req.body.archived
      );
      res.json(updatedOrder);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
