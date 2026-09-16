// ═══════════════════════════════════════════════════════════════════
// BHAAV — PostgreSQL Connection Module
// Drop-in replacement for the SQLite db.js: provides the same
// `all(sql, params)`, `get(sql, params)`, `run(sql, params)` interface
// so every existing route works unchanged.
//
// Connection pooling: uses pg.Pool sized to POOL_SIZE (default 30).
// The pool is shared across all requests — never one connection per req.
//
// Environment:
//   DATABASE_URL  — postgres://user:pass@host:port/dbname
//   POOL_SIZE     — max connections (default 30)
// ═══════════════════════════════════════════════════════════════════

import pg from "pg";

const { Pool } = pg;

let _pool = null;

/**
 * Get or create the shared connection pool.
 * Call once at startup; every route handler uses the returned db object.
 */
export function getPool() {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL;
  const poolSize = Number(process.env.POOL_SIZE || 30);

  _pool = new Pool({
    connectionString,
    max: poolSize,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Statement timeout: kill queries longer than 30s (safety net)
    statement_timeout: 30_000,
    // Query timeout for the client
    query_timeout: 30_000,
  });

  // Log pool errors (connection drops, etc.) but don't crash — pg will
  // evict the broken connection and create a new one automatically.
  _pool.on("error", (err) => {
    console.error("[pg] pool error:", err.message);
  });

  return _pool;
}

/**
 * Create the db interface that matches the old SQLite helper shape:
 *   { all, get, run }
 *
 * All three return the same shapes as the old module so routes don't
 * need to change their query patterns.
 */
export async function createDatabase() {
  const pool = getPool();

  // Run the migration on first connection
  await runMigrations(pool);

  return {
    /**
     * Query all matching rows.
     * @param {string} sql   — SQL with $1, $2, ... placeholders
     * @param {Array}  params — bind parameters
     * @returns {Promise<Array<Object>>}
     */
    async all(sql, params = []) {
      const result = await pool.query(sql, params);
      return result.rows;
    },

    /**
     * Query a single row (or null).
     */
    async get(sql, params = []) {
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    },

    /**
     * Execute a mutating statement (INSERT/UPDATE/DELETE).
     * Returns { rowCount, rows } for compatibility.
     */
    async run(sql, params = []) {
      const result = await pool.query(sql, params);
      return { rowCount: result.rowCount, rows: result.rows };
    },

    /** Expose pool for shutdown / health checks */
    pool,
  };
}

/**
 * Run migration.sql against the database.
 * Uses an idempotent transaction so it's safe to call on every boot.
 */
async function runMigrations(pool) {
  // Enable uuid-ossp if not already present (safety net beyond migration.sql)
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  // Create tables (IF NOT EXISTS ensures idempotency)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                    TEXT PRIMARY KEY,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      campus_pulse_opt_in   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      support_level         TEXT NOT NULL DEFAULT 'suggestions',
      trusted_name          TEXT NOT NULL DEFAULT '',
      trusted_channel       TEXT NOT NULL DEFAULT '',
      campus_opt_in         INTEGER NOT NULL DEFAULT 1,
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      typing_speed          DOUBLE PRECISION NOT NULL,
      mean_pause_ms         DOUBLE PRECISION NOT NULL,
      pause_std_dev_ms      DOUBLE PRECISION NOT NULL,
      correction_rate       DOUBLE PRECISION NOT NULL,
      timing_variance       DOUBLE PRECISION NOT NULL,
      session_duration      DOUBLE PRECISION NOT NULL,
      deviation             DOUBLE PRECISION,
      dominant_feature      TEXT,
      high_deviation        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS insights (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start            DATE NOT NULL,
      observation           TEXT NOT NULL,
      suggestion            TEXT NOT NULL,
      source                TEXT NOT NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      insight_id            UUID NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
      user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      response              TEXT NOT NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Indexes (all IF NOT EXISTS)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_created
      ON sessions (user_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_insights_user_created
      ON insights (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_insights_user_week
      ON insights (user_id, week_start);

    CREATE INDEX IF NOT EXISTS idx_feedback_insight
      ON feedback (insight_id);

    CREATE INDEX IF NOT EXISTS idx_sessions_deviation
      ON sessions (user_id, created_at, deviation)
      WHERE deviation IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_users_campus_opt_in
      ON users (campus_pulse_opt_in)
      WHERE campus_pulse_opt_in = 1;
  `);
}

/**
 * Row mapper: PostgreSQL row → camelCase session object.
 * Same contract as the old rowToSession in db.js.
 */
export function rowToSession(row) {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    typingSpeed: row.typing_speed,
    meanPauseMs: row.mean_pause_ms,
    pauseStdDevMs: row.pause_std_dev_ms,
    correctionRate: row.correction_rate,
    timingVariance: row.timing_variance,
    sessionDuration: row.session_duration,
    deviation: row.deviation,
    dominantFeature: row.dominant_feature,
    highDeviation: Boolean(row.high_deviation),
  };
}

/**
 * Graceful shutdown — drain the pool.
 * Call on SIGTERM/SIGINT before exit.
 */
export async function closeDatabase() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
