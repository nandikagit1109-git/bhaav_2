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

  // ── POST /api/auth/forgot-password ─────────────────────────────
  // Takes an email, generates a reset token, stores it with 1-hour expiry.
  // For now, logs the reset link to the server console.
  // Always returns 200 to prevent email enumeration.
  router.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }
      const normalizedEmail = email.trim().toLowerCase();

      // Always return success to prevent email enumeration
      const successResponse = {
        ok: true,
        message: "If an account with that email exists, a reset link has been sent.",
      };

      // Find user
      const user = await database.get(
        "SELECT id FROM users WHERE email = $1",
        [normalizedEmail],
      );
      if (!user) {
        return res.json(successResponse);
      }

      // Generate a random reset token (URL-safe)
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      // Store the hashed token with 1-hour expiry
      const resetId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await database.run(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at)
         VALUES ($1, $2, $3, $4, 0, $5)`,
        [resetId, user.id, tokenHash, expiresAt, new Date().toISOString()],
      );

      // Log the reset link to the server console
      // In production, this would send an email instead
      const resetUrl = `${req.headers.origin || "http://localhost:5173"}/reset-password?token=${rawToken}`;
      console.log("\n═══════════════════════════════════════════════════════════");
      console.log("PASSWORD RESET REQUEST");
      console.log(`Email: ${normalizedEmail}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`Expires: ${expiresAt}`);
      console.log("═══════════════════════════════════════════════════════════\n");

      res.json(successResponse);
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Unable to process request" });
    }
  });

  // ── POST /api/auth/reset-password ──────────────────────────────
  // Takes the raw token + new password, verifies the hash, updates the password.
  router.post("/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body || {};
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Reset token is required" });
      }
      if (!password || typeof password !== "string") {
        return res.status(400).json({ error: "New password is required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      if (password.length > 128) {
        return res.status(400).json({ error: "Password is too long" });
      }

      // Hash the provided token to compare against stored hash
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      // Find the reset record
      const reset = await database.get(
        "SELECT * FROM password_resets WHERE token_hash = $1 AND used = 0",
        [tokenHash],
      );
      if (!reset) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check expiry
      if (new Date(reset.expires_at) < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Update the user's password
      await database.run(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        [passwordHash, reset.user_id],
      );

      // Mark the token as used
      await database.run(
        "UPDATE password_resets SET used = 1 WHERE id = $1",
        [reset.id],
      );

      res.json({ ok: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Unable to reset password" });
    }
  });

  return router;
}
