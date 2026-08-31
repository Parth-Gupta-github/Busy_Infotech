const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Input validation error handler
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

// Register a new user
router.post(
    '/register',
    [
        body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
        body('name').trim().notEmpty().withMessage('Name is required.'),
        body('role').optional().isIn(['MANAGER', 'WAITER']).withMessage('Role must be MANAGER or WAITER.'),
        validate
    ],
    async (req, res, next) => {
        try {
            const { user, token } = await authService.registerUser(req.body);
            res.status(201).json({ user, token });
        } catch (err) {
            next(err);
        }
    }
);

// Authenticate user login
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required.'),
        validate
    ],
    async (req, res, next) => {
        try {
            const { user, token } = await authService.loginUser(req.body);
            res.json({ user, token });
        } catch (err) {
            next(err);
        }
    }
);

// Get authenticated user profile
router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        const user = await authService.getUserById(req.user.id);
        res.json(user);
    } catch (err) {
        next(err);
    }
});

// Get all waiter users for collaborator selection
router.get('/waiters', authenticateToken, async (req, res, next) => {
    try {
        const waiters = await authService.getAllWaiters();
        res.json(waiters);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
