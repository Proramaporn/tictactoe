/**
 * MySQL Schema Definitions
 * Contains CREATE TABLE statements for the Tic-Tac-Toe database
 */

const SCHEMA = {
  // Users table
  CREATE_USERS_TABLE: `
    CREATE TABLE IF NOT EXISTS users (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      username       VARCHAR(255) NOT NULL UNIQUE,
      email          VARCHAR(255) NOT NULL UNIQUE,
      password_hash  VARCHAR(255),
      oauth_provider VARCHAR(50),
      oauth_id       VARCHAR(255),
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Scores table
  CREATE_SCORES_TABLE: `
    CREATE TABLE IF NOT EXISTS scores (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      size         INT NOT NULL DEFAULT 3,
      total_score  INT DEFAULT 0,
      win_streak   INT DEFAULT 0,
      total_wins   INT DEFAULT 0,
      total_losses INT DEFAULT 0,
      total_draws  INT DEFAULT 0,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_size (user_id, size),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,

  // Games table
  CREATE_GAMES_TABLE: `
    CREATE TABLE IF NOT EXISTS games (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      size       INT NOT NULL DEFAULT 3,
      board      LONGTEXT NOT NULL,
      result     VARCHAR(50) DEFAULT 'ongoing',
      moves      LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `,
};

module.exports = SCHEMA;
