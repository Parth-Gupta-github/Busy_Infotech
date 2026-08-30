const express = require('express');
const { body, validationResult } = require('express-validator');
const menuService = require('../services/menuService');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

// Helper middleware for input validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

/**
 * GET /api/menu
 * List all menu items
 * Accessible by both WAITER and MANAGER
 * Query param: ?includeArchived=true (Managers can view archived items)
 */
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const includeArchived = req.query.includeArchived === 'true';
        const items = await menuService.getAllMenuItems(includeArchived);
        res.json(items);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/menu/:id
 * Get single menu item by ID
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const item = await menuService.getMenuItemById(req.params.id);
        res.json(item);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/menu
 * Create a new menu item
 * MANAGER ONLY
 */
router.post(
    '/',
    authenticateToken,
    requireRole('MANAGER'),
    [
        body('name').trim().notEmpty().withMessage('Menu item name is required.'),
        body('price').isFloat({ min: 0 }).withMessage('Price must be a valid non-negative number.'),
        body('available').optional().isBoolean().withMessage('Available must be a boolean.'),
        validate
    ],
    async (req, res, next) => {
        try {
            const newItem = await menuService.createMenuItem(req.body);
            res.status(201).json(newItem);
        } catch (err) {
            next(err);
        }
    }
);

/**
 * PUT /api/menu/:id
 * Update a menu item (name, price, availability)
 * MANAGER ONLY
 */
router.put(
    '/:id',
    authenticateToken,
    requireRole('MANAGER'),
    [
        body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
        body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number.'),
        body('available').optional().isBoolean().withMessage('Available must be a boolean.'),
        validate
    ],
    async (req, res, next) => {
        try {
            const updatedItem = await menuService.updateMenuItem(req.params.id, req.body);
            res.json(updatedItem);
        } catch (err) {
            next(err);
        }
    }
);

/**
 * PATCH /api/menu/:id/archive
 * Archive (soft-delete) or restore a menu item
 * MANAGER ONLY
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
            const item = await menuService.setArchiveStatus(req.params.id, req.body.archived);
            res.json(item);
        } catch (err) {
            next(err);
        }
    }
);

/**
 * PATCH /api/menu/bulk
 * Bulk update price or availability for multiple menu items at once
 * MANAGER ONLY
 * Assignment Rule: Must return per-item pass/fail results array!
 */
router.patch(
    '/bulk',
    authenticateToken,
    requireRole('MANAGER'),
    [
        body('updates').isArray({ min: 1 }).withMessage('Updates payload must be a non-empty array.'),
        validate
    ],
    async (req, res, next) => {
        try {
            const results = await menuService.bulkUpdateMenuItems(req.body.updates);
            res.json({ results });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
