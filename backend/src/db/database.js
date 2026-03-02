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

  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
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
