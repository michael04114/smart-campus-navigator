const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRole('admin'));

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
    try {
        const result = await req.db.query(`
      SELECT
        id,
        email,
        full_name,
        role,
        is_active,
        is_verified,
        created_at,
        last_login
      FROM users
      ORDER BY created_at DESC
    `);

        res.json({ users: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/stats - Get system statistics
router.get('/stats', async (req, res) => {
    try {
        // Get total users
        const totalUsersResult = await req.db.query('SELECT COUNT(*) FROM users');
        const totalUsers = parseInt(totalUsersResult.rows[0].count);

        // Get active users
        const activeUsersResult = await req.db.query('SELECT COUNT(*) FROM users WHERE is_active = true');
        const activeUsers = parseInt(activeUsersResult.rows[0].count);

        // Get total active events
        const totalEventsResult = await req.db.query(`
      SELECT COUNT(*) FROM events 
      WHERE is_active = true AND end_time > NOW()
    `);
        const totalEvents = parseInt(totalEventsResult.rows[0].count);

        // Get user breakdown by role
        const roleBreakdownResult = await req.db.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);
        const roleBreakdown = {};
        roleBreakdownResult.rows.forEach(row => {
            roleBreakdown[row.role] = parseInt(row.count);
        });

        res.json({
            totalUsers,
            activeUsers,
            totalEvents,
            roleBreakdown
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/users/:id/toggle - Toggle user active status
router.patch('/users/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        // Prevent admin from disabling themselves
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({ error: 'Cannot disable your own account' });
        }

        const result = await req.db.query(
            `UPDATE users 
       SET is_active = $1 
       WHERE id = $2 
       RETURNING id, email, full_name, role, is_active`,
            [is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/users/:id/verify - Approve a pending staff account
router.patch('/users/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.db.query(
            `UPDATE users
             SET is_verified = true, is_active = true
             WHERE id = $1 AND role = 'staff' AND is_verified = false
             RETURNING id, email, full_name, role, is_active, is_verified`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pending staff account not found' });
        }

        res.json({ message: 'Staff account approved', user: result.rows[0] });
    } catch (error) {
        console.error('Error approving staff:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/users/:id/role - Change user role
router.patch('/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Validate role
        if (!['student', 'staff', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Prevent admin from changing their own role
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        // When an admin manually grants the staff role, auto-approve
        const isVerified = role === 'staff' ? true : null;
        const isActive = true;

        const result = await req.db.query(
            `UPDATE users
             SET role = $1, is_verified = $2, is_active = $3
             WHERE id = $4
             RETURNING id, email, full_name, role, is_active, is_verified`,
            [role, isVerified, isActive, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Error changing user role:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = await req.db.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, email, full_name',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User deleted successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
