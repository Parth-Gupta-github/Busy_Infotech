/**
 * Role-Based Access Control (RBAC) Middleware Factory
 * Enforces server-side permissions based on user roles (MANAGER vs WAITER)
 * 
 * Usage:
 *   router.post('/menu', authenticateToken, requireRole('MANAGER'), handleCreateMenuItem);
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Action requires one of the following roles: ${allowedRoles.join(', ')}. Your role is ${req.user.role}.`
      });
    }

    next();
  };
}

module.exports = {
  requireRole
};
