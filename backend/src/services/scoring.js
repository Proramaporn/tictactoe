const { queryOne, queryAll, execute } = require('../db/database');

/**
 * Update score after a game result for a specific board size.
 */
async function updateScore(userId, size, result) {

    // Ensure score row exists
    await execute(
        `INSERT IGNORE INTO scores (user_id, size) VALUES (?, ?)`,
        [userId, size]
    );
    const score = await queryOne(
        `SELECT * FROM scores WHERE user_id = ? AND size = ?`,
        [userId, size]
    );
    if (!score) {
        throw new Error('Score record not found');
    }

    let {
        total_score,
        win_streak,
        total_wins,
        total_losses,
        total_draws
    } = score;

    let bonus = 0;

    if (result === 'win') {
        total_wins += 1;
        total_score += 1;
        win_streak += 1;

        if (win_streak >= 3) {
            bonus = 1;
            total_score += bonus;
            win_streak = 0;
        }

    } else if (result === 'loss') {
        total_losses += 1;
        total_score -= 1;
        win_streak = 0;

    } else if (result === 'draw') {
        total_draws += 1;
    }

    await execute(
        `UPDATE scores
         SET total_score  = ?,
             win_streak   = ?,
             total_wins   = ?,
             total_losses = ?,
             total_draws  = ?,
             updated_at   = CURRENT_TIMESTAMP
         WHERE user_id = ? AND size = ?`,
        [
            total_score,
            win_streak,
            total_wins,
            total_losses,
            total_draws,
            userId,
            size
        ]
    );

    return {
        total_score,
        win_streak,
        bonus,
    };
}

/**
 * Get score for a user for a specific size.
 */
async function getScore(userId, size) {
    // const db = getDb();
    await execute(
        `INSERT IGNORE INTO scores (user_id, size) VALUES (?, ?)`,
        [userId, size]
    );
    return await queryOne(
        `SELECT * FROM scores WHERE user_id = ? AND size = ?`,
        [userId, size]
    );
}


/**
 * Get leaderboard for a specific size.
 */
async function getLeaderboard(size) {
   return await queryAll(
        `SELECT
            u.id,
            u.username,
            u.email,
            s.total_score,
            s.win_streak,
            s.total_wins,
            s.total_losses,
            s.total_draws,
            s.updated_at
         FROM users u
         JOIN scores s ON s.user_id = u.id
         WHERE s.size = ?
         ORDER BY s.total_score DESC, s.total_wins DESC`,
        [size]
    );
}
module.exports = { updateScore, getScore, getLeaderboard };
