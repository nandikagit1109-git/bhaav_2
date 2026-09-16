-- ═══════════════════════════════════════════════════════════════════
-- BHAAV — Auth Migration
-- Adds email/password authentication to the users table.
-- Run once: psql "$DATABASE_URL" -f db/migration-auth.sql
-- ═══════════════════════════════════════════════════════════════════

-- Add auth columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER NOT NULL DEFAULT 0;

-- Index for login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- NOTES
-- ═══════════════════════════════════════════════════════════════════
-- • email is UNIQUE — one account per email address
-- • password_hash stores bcrypt hash (60 chars)
-- • display_name is shown in the UI (defaults to email prefix)
-- • email_verified is for future email verification (not required now)
-- • The existing TEXT primary key `id` is kept — it becomes the JWT `sub`
-- • The demo user ("demo") has no email/password — it's a shared demo account
