const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getScore, getLeaderboard } = require('../services/scoring');

const router = express.Router();

/**
 * GET /api/scores/me?size=3
 */
router.get('/me', authMiddleware, async (req, res) => {
     try {
        const size = parseInt(req.query.size) || 3;

        const score = await getScore(req.user.id, size);

        res.json({ score });

    } catch (err) {
        console.error('Get score error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/scores/leaderboard?size=3
 */
router.get('/leaderboard', async (req, res) => {
     try {
        const size = parseInt(req.query.size) || 3;
        const leaderboard = await getLeaderboard(size);
        res.json({ leaderboard });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
