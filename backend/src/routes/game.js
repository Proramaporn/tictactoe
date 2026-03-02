const express = require('express');
const { queryOne, queryAll, execute } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { getBotMove, evaluateBoard } = require('../services/botAI');
const { updateScore } = require('../services/scoring');

const router = express.Router();

/**
 * POST /api/game/new
 * Starts a new game for the authenticated user with a specific size (3, 5, or 10).
 */
router.post('/new', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const size = parseInt(req.body.size) || 3;

        if (![3, 5, 7].includes(size)) {
            return res.status(400).json({ error: 'Supported sizes are 3, 5, and 7' });
        }

        // Mark ongoing games as abandoned
        await execute(
            `UPDATE games SET result = 'abandoned' 
             WHERE user_id = ? AND result = 'ongoing'`,
            [userId]
        );

        const boardArray = Array(size * size).fill("");

        const result = await execute(
            `INSERT INTO games (user_id, size, board, result, moves)
             VALUES (?, ?, ?, 'ongoing', '[]')`,
            [userId, size, JSON.stringify(boardArray)]
        );

        res.status(201).json({
            message: 'New game started',
            game: {
                id: result.insertId,
                size,
                board: boardArray,
                result: 'ongoing',
                moves: [],
            },
        });

    } catch (err) {
        console.error('New game error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/game/move
 * Player move + Bot move.
 */
router.post('/move', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { cellIndex } = req.body;

        const game = await queryOne(
            `SELECT * FROM games 
             WHERE user_id = ? AND result = 'ongoing' 
             ORDER BY id DESC LIMIT 1`,
            [userId]
        );

        if (!game) {
            return res.status(404).json({ error: 'No active game found' });
        }

        const size = game.size;
        const board = JSON.parse(game.board);
        const moves = JSON.parse(game.moves);

        if (cellIndex === undefined || cellIndex < 0 || cellIndex >= board.length) {
            return res.status(400).json({ error: 'Invalid cell index' });
        }

        if (board[cellIndex] !== '') {
            return res.status(400).json({ error: 'Cell already occupied' });
        }

        // Player move
        board[cellIndex] = 'X';
        moves.push({ player: 'X', cell: cellIndex });

        let gameResult = evaluateBoard(board, size);
        let botMove = null;
        let scoreUpdate = null;

        if (!gameResult.ended) {
            botMove = getBotMove(board, size);

            if (botMove !== -1) {
                board[botMove] = 'O';
                moves.push({ player: 'O', cell: botMove });
                gameResult = evaluateBoard(board, size);
            }
        }

        let finalResult = 'ongoing';

        if (gameResult.ended) {
            if (gameResult.winner === 'X') finalResult = 'win';
            else if (gameResult.winner === 'O') finalResult = 'loss';
            else finalResult = 'draw';

            scoreUpdate = await updateScore(userId, size, finalResult);

            await execute(
                `UPDATE games 
                 SET board = ?, result = ?, moves = ? 
                 WHERE id = ?`,
                [
                    JSON.stringify(board),
                    finalResult,
                    JSON.stringify(moves),
                    game.id
                ]
            );

        } else {

            await execute(
                `UPDATE games 
                 SET board = ?, moves = ? 
                 WHERE id = ?`,
                [
                    JSON.stringify(board),
                    JSON.stringify(moves),
                    game.id
                ]
            );
        }

        res.json({
            board,
            botMove,
            result: finalResult,
            gameOver: gameResult.ended,
            winner: gameResult.winner,
            isDraw: gameResult.isDraw,
            scoreUpdate,
        });

    } catch (err) {
        console.error('Move error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/current', authMiddleware, async (req, res) => {
    try {
        const game = await queryOne(
            `SELECT * FROM games 
             WHERE user_id = ? AND result = 'ongoing'
             ORDER BY id DESC LIMIT 1`,
            [req.user.id]
        );

        res.json({
            game: game ? {
                id: game.id,
                size: game.size,
                board: JSON.parse(game.board),
                result: game.result,
                moves: JSON.parse(game.moves),
            } : null
        });

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
