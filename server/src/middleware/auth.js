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
        const error = new Error('Access token required.');
        error.status = 401;
        error.code = 'UNAUTHORIZED';
        return next(error);
    }

    jwt.verify(token, getJwtSecret(), (err, user) => {
        if (err) {
            const error = new Error('Invalid or expired token.');
            error.status = 403;
            error.code = 'FORBIDDEN';
            return next(error);
        }
        req.user = user;
        next();
    });
}

module.exports = {
    authenticateToken
};
