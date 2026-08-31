// Role checking middleware factory
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const userRole = req.user.role ? req.user.role.toUpperCase() : '';
        const hasRole = allowedRoles.some(r => r.toUpperCase() === userRole);

        if (!hasRole) {
            return res.status(403).json({
                error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}].`
            });
        }

        next();
    };
}

module.exports = {
    requireRole
};
