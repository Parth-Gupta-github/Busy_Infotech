const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'restaurant_secret_jwt_key_2026';
const JWT_EXPIRES_IN = '24h';

// Register a new user
async function registerUser({ email, password, name, role }) {
    if (!email || !password || !name || !role) {
        const error = new Error('All fields (email, password, name, role) are required.');
        error.status = 400;
        throw error;
    }

    const normalizedRole = role.toUpperCase();
    if (!['MANAGER', 'WAITER'].includes(normalizedRole)) {
        const error = new Error('Role must be either MANAGER or WAITER.');
        error.status = 400;
        throw error;
    }

    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existingUser.rowCount > 0) {
        const error = new Error('User with this email already exists.');
        error.status = 409;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
        `INSERT INTO users (email, password, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, role, created_at`,
        [email.toLowerCase().trim(), hashedPassword, name.trim(), normalizedRole]
    );

    const user = result.rows[0];
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return { user, token };
}

// Authenticate user login
async function loginUser({ email, password }) {
    if (!email || !password) {
        const error = new Error('Email and password are required.');
        error.status = 400;
        throw error;
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rowCount === 0) {
        const error = new Error('Invalid email or password.');
        error.status = 401;
        throw error;
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const error = new Error('Invalid email or password.');
        error.status = 401;
        throw error;
    }

    delete user.password;

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return { user, token };
}

// Get user profile by ID
async function getUserById(id) {
    const result = await db.query(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [id]
    );

    if (result.rowCount === 0) {
        const error = new Error('User not found.');
        error.status = 404;
        throw error;
    }

    return result.rows[0];
}

// Get all waiter users for collaborator assignment pickers
async function getAllWaiters() {
    const result = await db.query(
        `SELECT id, name, email, role 
         FROM users 
         WHERE role = 'WAITER' 
         ORDER BY name ASC`
    );
    return result.rows;
}

module.exports = {
    registerUser,
    loginUser,
    getUserById,
    getAllWaiters
};
