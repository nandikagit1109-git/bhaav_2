// ═══════════════════════════════════════════════════════════════════
// BHAAV — Neon Serverless PostgreSQL Adapter
//
// Drop-in replacement for pg.js using @neondatabase/serverless.
// Designed for Vercel serverless functions — no persistent connections,
// no connection pooling on the Node side (Neon's pooler handles it).
//
// Environment:
//   DATABASE_URL — Neon pooled connection string
//                  (ends in -pooler.<region>.aws.neon.tech)
// ═══════════════════════════════════════════════════════════════════

import { neon } from "@neondatabase/serverless";

let _sql = null;

/**
 * Get or create the Neon SQL function.
 * Each call is stateless — Neon manages connections server-side.
 */
function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Neon adapter");
  _sql = neon(url);
  return _sql;
}

/**
 * Create the db interface matching the pg.js / db.js shape:
 *   { all, get, run, pool }
 *
 * The `pool` property is a no-op object for compatibility with code
 * that calls `database.pool.end()` during shutdown.
 */
export async function createDatabase() {
  const sql = getSql();

  // Run migration on first connection (idempotent)
  await runMigrations(sql);

  return {
    /**
     * Query all matching rows.
     * @param {string} query — SQL with $1, $2, ... placeholders
     * @param {Array} params — bind parameters
     * @returns {Promise<Array<Object>>}
     */
    async all(query, params = []) {
      const rows = await sql(query, params);
      return rows;
    },

    /**
     * Query a single row (or null).
     */
    async get(query, params = []) {
      const rows = await sql(query, params);
      return rows[0] || null;
    },

    /**
     * Execute a mutating statement (INSERT/UPDATE/DELETE).
     * Returns { rowCount, rows } for compatibility.
     */
    async run(query, params = []) {
      // Neon's sql() returns rows for SELECT, but for mutations
      // we need to use a different approach
      const result = await sql(query, params);
      return {
        rowCount: Array.isArray(result) ? result.length : 0,
        rows: Array.isArray(result) ? result : [],
      };
    },

    /**
     * Compatibility shim — code that calls database.pool.end()
     * during shutdown won't crash. Neon doesn't have a local pool.
     */
    pool: {
      end: async () => {
        _sql = null;
      },
    },
  };
}

/**
 * Run idempotent migrations against Neon.
 * Same schema as pg.js — creates tables and indexes if they don't exist.
 */
async function runMigrations(sql) {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                    TEXT PRIMARY KEY,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      campus_pulse_opt_in   INTEGER NOT NULL DEFAULT 0,
      email                 TEXT UNIQUE,
      password_hash         TEXT,
      display_name          TEXT NOT NULL DEFAULT '',
      email_verified        INTEGER NOT NULL DEFAULT 0,
      recovery_code         TEXT UNIQUE
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
  `;

  await sql`
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
  `;

  // Migration: add recovery_code column if missing
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_code TEXT UNIQUE
  `;
}

/**
 * Row mapper: PostgreSQL row → camelCase session object.
 * Same contract as db.js / pg.js rowToSession.
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
 * Graceful shutdown — no-op for Neon (stateless).
 */
export async function closeDatabase() {
  _sql = null;
}
