const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { queryOne, queryAll, execute } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existing = await queryOne(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existing) {
            return res.status(409).json({ error: 'Username or email already in use' });
        }

        const hash = await bcrypt.hash(password, 12);

        const result = await execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hash]
        );

        const userId = result.insertId;

        await execute(
            'INSERT IGNORE INTO scores (user_id) VALUES (?)',
            [userId]
        );

        const token = jwt.sign(
            { id: userId, username, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: { id: userId, username, email },
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await queryOne(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, email]
        );

        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email },
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/auth/me
 * Returns the current logged-in user's info
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await queryOne(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Google OAuth 2.0 ──────────────────────────────────────────

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

/**
 * GET /api/auth/google/url
 * Returns the Google Auth URL for the frontend to redirect to
 */
router.get('/google/url', (req, res) => {
    const url = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
        prompt: 'select_account'
    });
    res.json({ url });
});

/**
 * POST /api/auth/google/callback
 * Body: { code }
 */
router.post('/google/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        // Exchange code for tokens
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);

        // Verify ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // 1️⃣ Check if user exists by oauth_id
        let user = await queryOne(
            'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?',
            ['google', googleId]
        );

        if (!user) {
            // 2️⃣ Check if user exists by email (link account)
            user = await queryOne(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (user) {
                // Link Google account
                await execute(
                    'UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?',
                    ['google', googleId, user.id]
                );
            } else {
                // 3️⃣ Create new user

                let baseUsername =
                    (name && name.replace(/\s+/g, '').toLowerCase()) ||
                    email.split('@')[0];

                let username = baseUsername;
                let counter = 1;

                // Ensure unique username
                while (await queryOne(
                    'SELECT id FROM users WHERE username = ?',
                    [username]
                )) {
                    username = `${baseUsername}${counter++}`;
                }

                const result = await execute(
                    'INSERT INTO users (username, email, oauth_provider, oauth_id) VALUES (?, ?, ?, ?)',
                    [username, email, 'google', googleId]
                );

                const userId = result.insertId;

                user = {
                    id: userId,
                    username,
                    email
                };

                // Create default score rows (if needed)
                await execute(
                    'INSERT IGNORE INTO scores (user_id, size) VALUES (?, ?)',
                    [userId, 3]
                );
            }
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY }
        );

        res.json({
            message: 'Google login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                picture
            },
        });

    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

module.exports = router;
