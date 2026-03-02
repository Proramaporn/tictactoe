const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getDb } = require('../db/database');
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

        const db = getDb();
        const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
        if (existing) {
            return res.status(409).json({ error: 'Username or email already in use' });
        }

        const hash = await bcrypt.hash(password, 12);
        const result = db.prepare(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
        ).run(username, email, hash);

        // Create default score row
        db.prepare('INSERT OR IGNORE INTO scores (user_id) VALUES (?)').run(result.lastInsertRowid);

        const token = jwt.sign(
            { id: result.lastInsertRowid, username, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY }
        );

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: { id: result.lastInsertRowid, username, email },
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

        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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
router.get('/me', authMiddleware, (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
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
        if (!code) return res.status(400).json({ error: 'Code is required' });

        // Exchange code for tokens
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);

        // Get user info from Google
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        const db = getDb();

        // 1. Check if user exists by oauth_id
        let user = db.prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?').get("google", googleId);

        if (!user) {
            // 2. Check if user exists by email (link accounts)
            user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

            if (user) {
                // Link existing account to Google
                db.prepare('UPDATE users SET oauth_provider = ? , oauth_id = ? WHERE id = ?').run("google", googleId, user.id);
            } else {
                // 3. Create new user
                // Generate a unique username if name is taken
                let baseUsername = name.replace(/\s+/g, '').toLowerCase() || email.split('@')[0];
                let username = baseUsername;
                let counter = 1;
                while (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
                    username = `${baseUsername}${counter++}`;
                }

                const result = db.prepare(
                    'INSERT INTO users (username, email, oauth_provider, oauth_id) VALUES (?, ?, ?, ?)'
                ).run(username, email, "google", googleId);

                user = { id: result.lastInsertRowid, username, email };

                // Create default score row
                db.prepare('INSERT OR IGNORE INTO scores (user_id) VALUES (?)').run(user.id);
            }
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY }
        );

        res.json({
            message: 'Google login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email, picture },
        });

    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

module.exports = router;
