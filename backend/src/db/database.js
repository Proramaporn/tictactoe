const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../game.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    initializeSchema();
    seedAdmin();
  }
  return db;
}

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      username       TEXT NOT NULL UNIQUE,
      email          TEXT NOT NULL UNIQUE,
      password_hash  TEXT,
      oauth_provider TEXT,
      oauth_id       TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check if scores table has the correct UNIQUE constraint (composite)
  const scoresInfo = db.prepare("PRAGMA index_list(scores)").all();
  let hasCompositeUnique = false;
  for (const idx of scoresInfo) {
    if (idx.unique) {
      const columns = db.prepare(`PRAGMA index_info(${idx.name})`).all();
      if (columns.length === 2 && columns.some(c => c.name === 'user_id') && columns.some(c => c.name === 'size')) {
        hasCompositeUnique = true;
        break;
      }
    }
  }

  if (!hasCompositeUnique) {
    console.log("[MIGRATION] Fixing scores table UNIQUE constraint for multi-size support...");
    db.exec(`
      CREATE TABLE IF NOT EXISTS scores_new (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        size         INTEGER NOT NULL DEFAULT 3,
        total_score  INTEGER DEFAULT 0,
        win_streak   INTEGER DEFAULT 0,
        total_wins   INTEGER DEFAULT 0,
        total_losses INTEGER DEFAULT 0,
        total_draws  INTEGER DEFAULT 0,
        updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, size),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Transfer existing data
    try {
      db.exec(`
        INSERT OR IGNORE INTO scores_new (user_id, size, total_score, win_streak, total_wins, total_losses, total_draws, updated_at)
        SELECT user_id, (CASE WHEN size IS NULL THEN 3 ELSE size END), total_score, win_streak, total_wins, total_losses, total_draws, updated_at FROM scores;
      `);
      db.exec(`DROP TABLE scores;`);
      db.exec(`ALTER TABLE scores_new RENAME TO scores;`);
    } catch (e) {
      console.error("[MIGRATION ERROR]", e);
    }
  }

  // Ensure games table has size column
  try { db.exec("ALTER TABLE games ADD COLUMN size INTEGER NOT NULL DEFAULT 3;"); } catch (e) { }

  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      size       INTEGER NOT NULL DEFAULT 3,
      board      TEXT NOT NULL,
      result     TEXT DEFAULT 'ongoing',
      moves      TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function seedAdmin() {
  const existing = db.prepare(
    "SELECT id FROM users WHERE username = ?"
  ).get("admin");

  if (!existing) {
    const hash = bcrypt.hashSync("admin", 10);

    db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `).run("admin", "admin@example.com", hash);

    console.log("✅ Default admin user created (admin / admin)");
  }
}

module.exports = { getDb };
