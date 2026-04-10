// ============================================
// AUTHENTICATION MIDDLEWARE
// backend/middleware/auth.js
// ============================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============================================
// AUTHENTICATE TOKEN MIDDLEWARE
// Verifies JWT token and attaches user to request
// ============================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Access denied. No token provided.'
        });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired. Please login again.'
            });
        }
        return res.status(403).json({
            error: 'Invalid token.'
        });
    }
}

// ============================================
// AUTHORIZE ROLE MIDDLEWARE
// Checks if user has required role(s)
// Usage: authorizeRole('admin') or authorizeRole(['admin', 'staff'])
// ============================================
function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized. Please login.'
            });
        }

        const userRole = req.user.role;
        const hasPermission = allowedRoles.includes(userRole);

        if (!hasPermission) {
            return res.status(403).json({
                error: 'Access denied. Insufficient permissions.',
                requiredRole: allowedRoles,
                yourRole: userRole
            });
        }

        next();
    };
}

// ============================================
// OPTIONAL AUTH MIDDLEWARE
// Attaches user if token exists, but doesn't require it
// ============================================
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Token invalid or expired, but that's okay for optional auth
            req.user = null;
        }
    }

    next();
}

module.exports = {
    authenticateToken,
    authorizeRole,
    optionalAuth
};
