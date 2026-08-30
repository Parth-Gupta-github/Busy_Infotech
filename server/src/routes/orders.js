const express = require('express');
const { body, query, validationResult } = require('express-validator');
const orderService = require('../services/orderService');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

// Input validation error handler helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

/**
 * POST /api/orders
 * Create a new order with optional menu item lines (Goal #2 & Goal #3)
 * Creator (req.user.id) automatically becomes primary waiter
 */
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
        created_by_id: req.user.id, // Logged-in user ID
        items: req.body.items || []
      });
      res.status(201).json(newOrder);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/orders
 * List paginated & filtered orders (Goal #6)
 */
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

/**
 * GET /api/orders/:id
 * Get single order by ID with order line details
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/orders/:id/archive
 * Soft-delete (archive) or restore an order (MANAGER ONLY)
 */
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
