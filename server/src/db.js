// ═══════════════════════════════════════════════════════════════════
// BHAAV — Database Adapter
//
// If DATABASE_URL is set → uses PostgreSQL (via pg.js)
// If DATABASE_URL is not set → uses SQLite (sql.js, in-memory or file)
//
// This lets developers run locally without PostgreSQL while the
// production deployment uses PG.
// ═══════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  campus_pulse_opt_in INTEGER DEFAULT 0,
  email TEXT UNIQUE,
  password_hash TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  email_verified INTEGER NOT NULL DEFAULT 0,
  recovery_code TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY,
  support_level TEXT NOT NULL DEFAULT 'suggestions',
  trusted_name TEXT NOT NULL DEFAULT '',
  trusted_channel TEXT NOT NULL DEFAULT '',
  campus_opt_in INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  typing_speed REAL NOT NULL,
  mean_pause_ms REAL NOT NULL,
  pause_std_dev_ms REAL NOT NULL,
  correction_rate REAL NOT NULL,
  timing_variance REAL NOT NULL,
  session_duration REAL NOT NULL,
  deviation REAL,
  dominant_feature TEXT,
  high_deviation INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  observation TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  insight_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

export async function createDatabase(filePath) {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(path.dirname(require.resolve("sql.js")), file),
  });

  let db;
  if (filePath && fs.existsSync(filePath)) {
    db = new SQL.Database(fs.readFileSync(filePath));
  } else {
    db = new SQL.Database();
  }
  db.run(SCHEMA);

  // Migration: add campus_pulse_opt_in column to existing databases
  try {
    db.run("ALTER TABLE users ADD COLUMN campus_pulse_opt_in INTEGER DEFAULT 0");
  } catch (_) { /* column already exists */ }

  // Migration: add auth columns
  try {
    db.run("ALTER TABLE users ADD COLUMN email TEXT");
  } catch (_) { /* column already exists */ }
  try {
    db.run("ALTER TABLE users ADD COLUMN password_hash TEXT");
  } catch (_) { /* column already exists */ }
  try {
    db.run("ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''");
  } catch (_) { /* column already exists */ }
  try {
    db.run("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
  } catch (_) { /* column already exists */ }
  // Migration: add recovery_code column
  try {
    db.run("ALTER TABLE users ADD COLUMN recovery_code TEXT");
  } catch (_) { /* column already exists */ }

  function persist() {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(db.export()));
  }

  // Convert PostgreSQL-specific syntax to SQLite
  function adaptQuery(sql) {
    return sql
      .replace(/\$(\d+)/g, '?')  // $1 → ?
      .replace(/::int/g, '')       // remove ::int casts
      .replace(/::text/g, '')      // remove ::text casts
      .replace(/ON CONFLICT \([^)]+\) DO NOTHING/g, '')  // remove ON CONFLICT clauses
      .replace(/RETURNING [^;]+/g, '');  // remove RETURNING clauses
  }

  function all(sql, params = []) {
    const stmt = db.prepare(adaptQuery(sql));
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  function get(sql, params = []) {
    return all(sql, params)[0] || null;
  }

  function run(sql, params = []) {
    db.run(adaptQuery(sql), params);
    persist();
  }

  persist();
  return { db, all, get, run, persist, filePath };
}

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

export async function closeDatabase() {
  // SQLite: no-op (db persists to file)
}
