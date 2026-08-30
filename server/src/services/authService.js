const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * Register a new user account (MANAGER or WAITER)
 */
async function register({ email, password, name, role }) {
  // 1. Check if email already exists
  const existingUserRes = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  if (existingUserRes.rowCount > 0) {
    const error = new Error('An account with this email address already exists.');
    error.status = 400;
    throw error;
  }

  // 2. Hash password securely
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Insert new user into database
  const insertRes = await db.query(
    `INSERT INTO users (email, password, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, created_at`,
    [email.toLowerCase().trim(), hashedPassword, name.trim(), role]
  );

  const user = insertRes.rows[0];

  // 4. Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
}

/**
 * Authenticate a user with email and password
 */
async function login({ email, password }) {
  // 1. Look up user by email
  const userRes = await db.query(
    'SELECT id, email, password, name, role, created_at FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  if (userRes.rowCount === 0) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  const user = userRes.rows[0];

  // 2. Compare password hash
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  // Remove password hash from returned user object
  delete user.password;

  // 3. Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
}

/**
 * Fetch profile for authenticated user
 */
async function getUserById(id) {
  const userRes = await db.query(
    'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
    [id]
  );

  if (userRes.rowCount === 0) {
    const error = new Error('User account not found.');
    error.status = 404;
    throw error;
  }

  return userRes.rows[0];
}

module.exports = {
  register,
  login,
  getUserById
};
