const jwt = require('jsonwebtoken');

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('FATAL: JWT_SECRET environment variable is required. Please set JWT_SECRET in your .env file.');
    }
    return secret;
}

// JWT verification middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required.' });
    }

    jwt.verify(token, getJwtSecret(), (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
}

module.exports = {
    authenticateToken
};
