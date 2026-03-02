const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const SCHEMA = require('./schema');

let pool;

async function getDb(retries = 5, delay = 5000) {
  if (!pool) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'tictactoe',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Test connection
      await pool.getConnection()
        .then(conn => conn.release());

      console.log("✅ Database pool created");
      await initializeSchema();
      await seedAdmin();
    } catch (err) {
      if (retries > 0) {
        console.log(`📡 Database connection failed. Retrying in ${delay / 1000}s... (${retries} retries left)`);
        pool = null; // Reset pool so it can be recreated
        await new Promise(resolve => setTimeout(resolve, delay));
        return getDb(retries - 1, delay);
      } else {
        console.error("❌ Max retries reached. Could not connect to database.");
        throw err;
      }
    }
  }
  return pool;
}

async function initializeSchema() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(SCHEMA.CREATE_USERS_TABLE);
    await connection.execute(SCHEMA.CREATE_SCORES_TABLE);
    await connection.execute(SCHEMA.CREATE_GAMES_TABLE);
    console.log("✅ Database tables initialized");
  } finally {
    connection.release();
  }
}

async function seedAdmin() {
  const connection = await pool.getConnection();
  try {
    const [existing] = await connection.execute(
      "SELECT id FROM users WHERE username = ?",
      ["admin"]
    );

    if (existing.length === 0) {
      const hash = bcrypt.hashSync("admin", 10);

      await connection.execute(
        `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
        ["admin", "admin@example.com", hash]
      );
      console.log("✅ Default admin user created (username: admin, password: admin)");
    }
  } finally {
    connection.release();
  }
}

module.exports = { getDb, queryOne, queryAll, execute };

// Helper function to execute a SELECT query and return one row
async function queryOne(sql, params = []) {
  const pool = await getDb();
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

// Helper function to execute a SELECT query and return all rows
async function queryAll(sql, params = []) {
  const pool = await getDb();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Helper function to execute an INSERT/UPDATE/DELETE query
async function execute(sql, params = []) {
  const pool = await getDb();
  const [result] = await pool.execute(sql, params);
  return result;
}
