-- ═══════════════════════════════════════════════════════════════════
-- BHAAV — PostgreSQL Migration
-- Converts the SQLite schema to PostgreSQL with UUID primary keys,
-- performance indexes, and proper types.
-- Run once: psql "$DATABASE_URL" -f db/migration.sql
-- ═══════════════════════════════════════════════════════════════════

-- UUID generation via pgcrypto (ships with PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,          -- app-generated IDs remain TEXT
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  campus_pulse_opt_in   INTEGER NOT NULL DEFAULT 0,
  recovery_code         TEXT UNIQUE
);

-- ── Settings (one row per user) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  user_id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  support_level         TEXT NOT NULL DEFAULT 'suggestions',
  trusted_name          TEXT NOT NULL DEFAULT '',
  trusted_channel       TEXT NOT NULL DEFAULT '',
  campus_opt_in         INTEGER NOT NULL DEFAULT 1,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Sessions (one row per writing session) ────────────────────────
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
  high_deviation        INTEGER NOT NULL DEFAULT 0,
  long_pause_rate       DOUBLE PRECISION NOT NULL DEFAULT 0,
  correction_burst_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed_decay           DOUBLE PRECISION NOT NULL DEFAULT 0,
  smoothed_combined_z   DOUBLE PRECISION,
  session_duration_minutes DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- ── Insights (one per user per week) ──────────────────────────────
CREATE TABLE IF NOT EXISTS insights (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start            DATE NOT NULL,
  observation           TEXT NOT NULL,
  suggestion            TEXT NOT NULL,
  source                TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Feedback (one per insight, at most) ───────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id            UUID NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response              TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Backfills for databases created before these columns existed ──
-- (CREATE TABLE IF NOT EXISTS above won't add columns to old tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS campus_pulse_opt_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_code TEXT UNIQUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS long_pause_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS correction_burst_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS speed_decay DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS smoothed_combined_z DOUBLE PRECISION;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_duration_minutes DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES — hit on every request path
-- ═══════════════════════════════════════════════════════════════════

-- Session lookups: "all sessions for user, ordered by time"
-- Supports /api/state, /api/sessions (baseline recompute), /api/export
CREATE INDEX IF NOT EXISTS idx_sessions_user_created
  ON sessions (user_id, created_at);

-- Insight lookups: "latest insight for user" and "this week's insight"
-- Supports /api/state, /api/insights/weekly, /api/export
CREATE INDEX IF NOT EXISTS idx_insights_user_created
  ON insights (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_user_week
  ON insights (user_id, week_start);

-- Feedback: "feedback for this insight"
CREATE INDEX IF NOT EXISTS idx_feedback_insight
  ON feedback (insight_id);

-- Campus pulse: "all opted-in users' sessions with deviation"
CREATE INDEX IF NOT EXISTS idx_sessions_deviation
  ON sessions (user_id, created_at, deviation)
  WHERE deviation IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_campus_opt_in
  ON users (campus_pulse_opt_in)
  WHERE campus_pulse_opt_in = 1;

-- ═══════════════════════════════════════════════════════════════════
-- NOTES
-- ═══════════════════════════════════════════════════════════════════
-- • session IDs are UUID but stored as pg UUID (binary, indexed).
--   App-generated TEXT IDs for users/settings are kept as-is to avoid
--   breaking the frontend contract.
-- • TIMESTAMPTZ for all timestamps — the server always sends ISO-8601
--   strings; PG stores timezone-aware and returns the same format.
-- • ON DELETE CASCADE: deleting a user cascades to settings, sessions,
--   insights, and feedback — matches the DELETE /api/me contract.
-- • Partial indexes on campus_pulse_opt_in and deviation keep the
--   working set small since most users don't opt in and sessions
--   before baseline are always NULL-deviation.
