const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getScore, getLeaderboard } = require('../services/scoring');

const router = express.Router();

/**
 * GET /api/scores/me?size=3
 */
router.get('/me', authMiddleware, (req, res) => {
    try {
        const size = parseInt(req.query.size) || 3;
        const score = getScore(req.user.id, size);
        res.json({ score });
    } catch (err) {
        console.error('Get score error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/scores/leaderboard?size=3
 */
router.get('/leaderboard', (req, res) => {
    try {
        const size = parseInt(req.query.size) || 3;
        const leaderboard = getLeaderboard(size);
        res.json({ leaderboard });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
