const { getDb } = require('../db/database');

/**
 * Update score after a game result for a specific board size.
 */
function updateScore(userId, size, result) {
    const db = getDb();

    // Ensure score row exists for this user AND size
    db.prepare(`
    INSERT OR IGNORE INTO scores (user_id, size) VALUES (?, ?)
  `).run(userId, size);

    const score = db.prepare('SELECT * FROM scores WHERE user_id = ? AND size = ?').get(userId, size);
    let { total_score, win_streak, total_wins, total_losses, total_draws } = score;

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

    db.prepare(`
    UPDATE scores
    SET total_score  = ?,
        win_streak   = ?,
        total_wins   = ?,
        total_losses = ?,
        total_draws  = ?,
        updated_at   = CURRENT_TIMESTAMP
    WHERE user_id = ? AND size = ?
  `).run(total_score, win_streak, total_wins, total_losses, total_draws, userId, size);

    return {
        total_score,
        win_streak,
        bonus,
    };
}

/**
 * Get score for a user for a specific size.
 */
function getScore(userId, size) {
    const db = getDb();
    db.prepare(`INSERT OR IGNORE INTO scores (user_id, size) VALUES (?, ?)`).run(userId, size);
    return db.prepare('SELECT * FROM scores WHERE user_id = ? AND size = ?').get(userId, size);
}

/**
 * Get leaderboard for a specific size.
 */
function getLeaderboard(size) {
    const db = getDb();
    return db.prepare(`
    SELECT
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
    ORDER BY s.total_score DESC, s.total_wins DESC
  `).all(size);
}

module.exports = { updateScore, getScore, getLeaderboard };
