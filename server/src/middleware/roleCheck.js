// Role checking middleware factory
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            const error = new Error('Authentication required.');
            error.status = 401;
            error.code = 'UNAUTHORIZED';
            return next(error);
        }

        const userRole = req.user.role ? req.user.role.toUpperCase() : '';
        const hasRole = allowedRoles.some(r => r.toUpperCase() === userRole);

        if (!hasRole) {
            const error = new Error(`Access denied. Requires one of roles: [${allowedRoles.join(', ')}].`);
            error.status = 403;
            error.code = 'FORBIDDEN';
            return next(error);
        }

        next();
    };
}

module.exports = {
    requireRole
};
