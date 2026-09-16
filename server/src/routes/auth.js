// ═══════════════════════════════════════════════════════════════════
// BHAAV — Auth Routes
//
// POST /api/auth/signup   — create account (email + password)
// POST /api/auth/login    — sign in, returns JWT
// GET  /api/auth/me       — get current user (requires JWT)
// POST /api/auth/logout   — client-side only (invalidate token)
// ═══════════════════════════════════════════════════════════════════

import bcrypt from "bcrypt";
import crypto from "node:crypto";
import express from "express";
import { signToken, requireAuth } from "../middleware/auth.js";

const SALT_ROUNDS = 10;

/**
 * Create auth router.
 * @param {object} database — the pg database object { all, get, run }
 * @returns {express.Router}
 */
export function createAuthRouter(database) {
  const router = express.Router();

  // ── POST /api/auth/signup ──────────────────────────────────────
  router.post("/signup", async (req, res) => {
    try {
      const { email, password, displayName } = req.body || {};

      // Validate email
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Validate password
      if (!password || typeof password !== "string") {
        return res.status(400).json({ error: "Password is required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      if (password.length > 128) {
        return res.status(400).json({ error: "Password is too long" });
      }

      // Check if email already exists
      const existing = await database.get("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user ID (random, not email-based)
      const userId = `user_${crypto.randomBytes(12).toString("hex")}`;
      const name = (displayName || normalizedEmail.split("@")[0]).slice(0, 80);

      // Insert user
      await database.run(
        `INSERT INTO users (id, email, password_hash, display_name, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, normalizedEmail, passwordHash, name, new Date().toISOString()],
      );

      // Create default settings
      await database.run(
        `INSERT INTO settings (user_id, support_level, trusted_name, trusted_channel, campus_opt_in, updated_at)
         VALUES ($1, 'suggestions', '', '', 1, $2)`,
        [userId, new Date().toISOString()],
      );

      // Generate JWT
      const token = signToken(userId);

      res.status(201).json({
        ok: true,
        token,
        user: {
          id: userId,
          email: normalizedEmail,
          displayName: name,
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Unable to create account" });
    }
  });

  // ── POST /api/auth/login ───────────────────────────────────────
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const normalizedEmail = email.trim().toLowerCase();

      // Find user
      const user = await database.get(
        "SELECT id, email, password_hash, display_name FROM users WHERE email = $1",
        [normalizedEmail],
      );
      if (!user || !user.password_hash) {
        // Generic message to prevent email enumeration
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate JWT
      const token = signToken(user.id);

      res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Unable to sign in" });
    }
  });

  // ── GET /api/auth/me ───────────────────────────────────────────
  router.get("/me", requireAuth, async (req, res) => {
    try {
      const user = await database.get(
        "SELECT id, email, display_name, created_at FROM users WHERE id = $1",
        [req.userId],
      );
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Unable to fetch user" });
    }
  });

  // ── POST /api/auth/logout ──────────────────────────────────────
  // Client-side only: clear the token from localStorage.
  // For true server-side logout, you'd need a token blacklist (Redis).
  router.post("/logout", (_req, res) => {
    res.json({ ok: true, message: "Token cleared client-side" });
  });

  return router;
}
