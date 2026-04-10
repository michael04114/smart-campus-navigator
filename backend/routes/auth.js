// ============================================
// AUTHENTICATION ROUTES
// backend/routes/auth.js
// ============================================

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// ============================================
// EMAIL TRANSPORTER
// ============================================
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

// ============================================
// REGISTER NEW USER
// POST /api/auth/register
// ============================================
router.post(
    '/register',
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters'),
        body('full_name')
            .trim()
            .isLength({ min: 2 })
            .withMessage('Full name is required'),
        body('role')
            .optional()
            .isIn(['student', 'staff', 'admin'])
            .withMessage('Invalid role')
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { email, password, full_name, role = 'student' } = req.body;

            // Check if user already exists
            const existingUser = await req.db.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    error: 'User already exists with this email'
                });
            }

            // Hash password
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);

            // Staff accounts start inactive and unverified — pending admin approval
            const isStaff = role === 'staff';

            // Insert new user
            const result = await req.db.query(
                `INSERT INTO users (email, password_hash, full_name, role, is_active, is_verified)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, email, full_name, role, created_at`,
                [email, password_hash, full_name, role, !isStaff, isStaff ? false : null]
            );

            const user = result.rows[0];

            // Staff must wait for admin approval before they can sign in
            if (isStaff) {
                return res.status(201).json({
                    pending: true,
                    message: 'Your staff account has been created and is awaiting admin approval. You will be able to sign in once an administrator verifies your account.'
                });
            }

            // Generate JWT token (students only at this point)
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    created_at: user.created_at
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                error: 'Registration failed',
                message: error.message
            });
        }
    }
);

// ============================================
// LOGIN USER
// POST /api/auth/login
// ============================================
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').exists()
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Invalid credentials'
                });
            }

            const { email, password } = req.body;

            // Find user by email
            const result = await req.db.query(
                `SELECT id, email, password_hash, full_name, role, is_active, is_verified
                 FROM users
                 WHERE email = $1`,
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            const user = result.rows[0];

            // Staff pending approval:
            // Catches both new accounts (is_verified = false) and legacy accounts
            // created before the is_verified column existed (is_verified = null, is_active = false)
            const isPendingStaff = user.role === 'staff' && !user.is_active && user.is_verified !== true;
            if (isPendingStaff) {
                return res.status(403).json({
                    error: 'pending_approval',
                    message: 'Your staff account is pending admin approval. Please check back later or contact an administrator.'
                });
            }

            // Check if user is active (disabled by admin)
            if (!user.is_active) {
                return res.status(403).json({
                    error: 'Account is disabled. Please contact administrator.'
                });
            }

            // Verify password
            const passwordMatch = await bcrypt.compare(password, user.password_hash);

            if (!passwordMatch) {
                return res.status(401).json({
                    error: 'Invalid email or password'
                });
            }

            // Update last login timestamp
            await req.db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                error: 'Login failed',
                message: error.message
            });
        }
    }
);

// ============================================
// VERIFY TOKEN
// GET /api/auth/verify
// ============================================
router.get('/verify', async (req, res) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'No token provided'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get fresh user data from database
        const result = await req.db.query(
            `SELECT id, email, full_name, role, is_active, created_at, last_login 
       FROM users 
       WHERE id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'User not found'
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                error: 'Account is disabled'
            });
        }

        res.json({
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                created_at: user.created_at,
                last_login: user.last_login
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired'
            });
        }

        console.error('Verify error:', error);
        res.status(500).json({
            error: 'Verification failed'
        });
    }
});

// ============================================
// GET CURRENT USER
// GET /api/auth/me
// ============================================
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'No token provided'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);

        const result = await req.db.query(
            `SELECT id, email, full_name, role, is_active, created_at, last_login 
       FROM users 
       WHERE id = $1 AND is_active = true`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json({ user: result.rows[0] });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({
            error: 'Unauthorized'
        });
    }
});

// ============================================
// REQUEST PASSWORD RESET
// POST /api/auth/forgot-password
// ============================================
router.post(
    '/forgot-password',
    [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
    async (req, res) => {
        // Always respond with success to prevent email enumeration
        const genericResponse = { message: 'If that email is registered you will receive a reset link shortly.' };

        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: 'Valid email is required' });
            }

            const { email } = req.body;

            // Build the base URL for the reset link.
            // Priority:
            //   1. Referer header origin — the exact URL the user was on when they
            //      submitted the form (ngrok URL on phone, localhost on laptop).
            //      Preserved by Vite's proxy even with changeOrigin: true.
            //   2. FRONTEND_URL env var — fallback for cases where Referer is absent.
            //   3. localhost — last resort for pure local development.
            let frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
            try {
                const referer = req.headers.referer || req.headers.referrer;
                if (referer) {
                    const refererOrigin = new URL(referer).origin;
                    // Prefer the referer origin; only skip it if it's localhost AND
                    // we already have a non-localhost FRONTEND_URL configured.
                    const frontendIsNgrok = frontendBase && !frontendBase.includes('localhost');
                    const refererIsNgrok = !refererOrigin.includes('localhost') && !refererOrigin.includes('127.0.0.1');
                    if (refererIsNgrok || !frontendIsNgrok) {
                        frontendBase = refererOrigin;
                    }
                }
            } catch { /* malformed referer — keep the env fallback */ }

            const result = await req.db.query(
                'SELECT id, full_name FROM users WHERE email = $1 AND is_active = true',
                [email]
            );

            if (result.rows.length === 0) {
                // Don't reveal whether the email exists
                return res.json(genericResponse);
            }

            const user = result.rows[0];

            // Generate a secure random token (expires in 1 hour)
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            await req.db.query(
                'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
                [token, expires, user.id]
            );

            const resetUrl = `${frontendBase}/reset-password/${token}`;

            const transporter = createTransporter();
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || 'Smart Campus Navigator <noreply@campus.ac.uk>',
                to: email,
                subject: 'Reset your Smart Campus Navigator password',
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
                        <div style="text-align:center;margin-bottom:28px;">
                            <h1 style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 8px 0;">
                                Smart Campus Navigator
                            </h1>
                            <p style="color:#64748b;margin:0;font-size:15px;">Password Reset Request</p>
                        </div>
                        <div style="background:#fff;border-radius:10px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
                            <p style="color:#1e293b;font-size:16px;margin:0 0 16px 0;">Hi ${user.full_name},</p>
                            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
                                We received a request to reset your password. Click the button below to choose a new one.
                                This link expires in <strong>1 hour</strong>.
                            </p>
                            <div style="text-align:center;margin-bottom:24px;">
                                <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px;">
                                    Reset Password
                                </a>
                            </div>
                            <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">
                                If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
                                Or copy this link into your browser:<br>
                                <a href="${resetUrl}" style="color:#667eea;word-break:break-all;">${resetUrl}</a>
                            </p>
                        </div>
                    </div>
                `,
            });

            res.json(genericResponse);

        } catch (error) {
            console.error('Forgot password error:', error);
            // Still return generic message to avoid leaking info
            res.json(genericResponse);
        }
    }
);

// ============================================
// RESET PASSWORD WITH TOKEN
// POST /api/auth/reset-password
// ============================================
router.post(
    '/reset-password',
    [
        body('token').notEmpty().withMessage('Token is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { token, password } = req.body;

            const result = await req.db.query(
                `SELECT id FROM users
                 WHERE reset_token = $1
                   AND reset_token_expires > NOW()
                   AND is_active = true`,
                [token]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
            }

            const userId = result.rows[0].id;
            const password_hash = await bcrypt.hash(password, 10);

            await req.db.query(
                `UPDATE users
                 SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
                 WHERE id = $2`,
                [password_hash, userId]
            );

            res.json({ message: 'Password reset successfully. You can now sign in.' });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Failed to reset password. Please try again.' });
        }
    }
);

// ============================================
// CHANGE PASSWORD (authenticated)
// POST /api/auth/change-password
// ============================================
router.post(
    '/change-password',
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
            const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET);

            const { currentPassword, newPassword } = req.body;

            const result = await req.db.query(
                'SELECT id, password_hash FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

            const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
            if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

            const newHash = await bcrypt.hash(newPassword, 10);
            await req.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, decoded.userId]);

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Failed to change password' });
        }
    }
);

// ============================================
// UPDATE PROFILE (authenticated)
// PATCH /api/auth/profile
// ============================================
router.patch(
    '/profile',
    [body('full_name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters')],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
            const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET);

            const { full_name } = req.body;
            const result = await req.db.query(
                'UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, email, full_name, role, created_at, last_login',
                [full_name, decoded.userId]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

            res.json({ message: 'Profile updated', user: result.rows[0] });
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }
);

module.exports = router;
