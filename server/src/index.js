import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { rowToSession } from "./pg.js";
import { createDatabase as createSqliteDatabase } from "./db.js";
import { campusAggregate, weekStart, HIGH_DEVIATION } from "./stats.js";
import { generateInsight } from "../lib/insights.js";
import { assertUserId } from "./validate.js";
import { sanitizeSession } from "../lib/validate.js";
import { buildBaseline, scoreSession, scoreSmoothed, summarizeDirection } from "../lib/baseline.js";
import { seedDatabase } from "./seed.js";
import { initCache, getCachedBaseline, setCachedBaseline, invalidateBaseline, invalidateAllBaselines, closeCache } from "./cache.js";
import {
  sessionRateLimit,
  insightRateLimit,
  feedbackRateLimit,
  generalWriteRateLimit,
  recoveryRateLimit,
} from "./middleware/rateLimit.js";
import { generateUniqueRecoveryCode } from "./recovery.js";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

const MIN_GROUP_SIZE = Number(process.env.MIN_GROUP_SIZE || 10);
const PORT = Number(process.env.PORT || 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

function userIdFrom(req) {
  // userIdFrom reads the anonymous x-bhaav-user header (localStorage user_id)
  if (req.userId && req.userId !== "demo") return req.userId;
  // Fallback for backward compatibility (demo mode)
  return assertUserId(req.header("x-bhaav-user") || "demo");
}

async function ensureUser(db, userId) {
  const existing = await db.get("SELECT id, recovery_code FROM users WHERE id = $1", [userId]);
  let isNew = false;
  if (!existing) {
    // Auto-generate a recovery code so the user can recover data later
    const recoveryCode = await generateUniqueRecoveryCode(db);
    await db.run(
      "INSERT INTO users (id, created_at, recovery_code) VALUES ($1, $2, $3)",
      [userId, new Date().toISOString(), recoveryCode],
    );
    isNew = true;
  } else if (!existing.recovery_code) {
    // Backfill recovery code for existing users who don't have one yet
    const recoveryCode = await generateUniqueRecoveryCode(db);
    await db.run(
      "UPDATE users SET recovery_code = $1 WHERE id = $2",
      [recoveryCode, userId],
    );
  }
  const hasSettings = await db.get("SELECT user_id FROM settings WHERE user_id = $1", [userId]);
  if (!hasSettings) {
    await db.run(
      `INSERT INTO settings (user_id, support_level, trusted_name, trusted_channel, campus_opt_in, updated_at)
       VALUES ($1, 'suggestions', '', '', 1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [userId, new Date().toISOString()],
    );
  }
  return isNew;
}

async function sessionsFor(db, userId) {
  const rows = await db.all(
    "SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at ASC",
    [userId],
  );
  return rows.map(rowToSession);
}

async function settingsFor(db, userId) {
  await ensureUser(db, userId);
  const row = await db.get("SELECT * FROM settings WHERE user_id = $1", [userId]);
  return {
    supportLevel: row.support_level,
    trustedName: row.trusted_name,
    trustedChannel: row.trusted_channel,
    campusOptIn: Boolean(row.campus_opt_in),
  };
}

/**
 * Get baseline with Redis read-through caching.
 * Cache key: bhaav:baseline:{userId}
 * TTL: 10 minutes (default)
 * Invalidated: on POST /api/sessions (baseline recompute)
 */
async function getBaselineCached(db, userId, sessions) {
  // Try cache first
  const cached = await getCachedBaseline(userId);
  if (cached) return cached;

  // Compute from sessions
  const prior = sessions.slice(0, -1);
  const baseline = buildBaseline(prior.length ? prior : sessions.slice(0, 0));

  // Store in cache (fire-and-forget)
  setCachedBaseline(userId, baseline);

  return baseline;
}

export async function createApp(database) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  // ── Serve built React frontend (production) ─────────────────
  const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
  try {
    const { default: fs } = await import("node:fs");
    if (fs.existsSync(clientDist)) {
      app.use(express.static(clientDist));
    }
  } catch { /* no static serving in tests */ }
  app.use(
    cors({
      origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN,
      allowedHeaders: ["Content-Type", "Authorization", "x-bhaav-user"],
      credentials: true,
    }),
  );

  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  // ── Health check (no rate limit) ──────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, name: "bhaav", storesJournalText: false });
  });

  // ── Privacy info (no rate limit) ──────────────────────────────
  app.get("/api/privacy", (_req, res) => {
    res.json({
      stored: [
        "typing speed",
        "pause patterns",
        "correction rate",
        "timing variability",
        "session timing",
        "rhythm deviation",
        "support preferences",
        "optional trusted-contact labels",
      ],
      neverStored: [
        "journal text",
        "individual characters",
        "clipboard contents",
        "passwords",
        "messages from other apps",
      ],
      pipeline: [
        "Keyboard events stay in the browser",
        "Local aggregation",
        "Feature extraction",
        "Session-level metadata",
        "Backend baseline comparison",
      ],
    });
  });

  // ── Recovery: get user_id by recovery code (rate-limited) ─────
  app.get("/api/users/recover/:recoveryCode", recoveryRateLimit, async (req, res) => {
    try {
      const { recoveryCode } = req.params;
      if (!recoveryCode || typeof recoveryCode !== "string") {
        return res.status(400).json({ error: "Invalid recovery code" });
      }
      const user = await database.get(
        "SELECT id FROM users WHERE recovery_code = $1",
        [recoveryCode],
      );
      if (!user) {
        // Never reveal whether a similar code exists
        return res.status(404).json({ error: "Recovery code not found" });
      }
      res.json({ userId: user.id });
    } catch (error) {
      res.status(500).json({ error: "Recovery lookup failed" });
    }
  });

  // ── State: sessions + baseline + insight + settings ───────────
  app.get("/api/state", async (req, res) => {
    try {
      const userId = userIdFrom(req);
      const isNew = await ensureUser(database, userId);
      const sessions = await sessionsFor(database, userId);
      const baseline = await getBaselineCached(database, userId, sessions);
      const latest = sessions.at(-1) || null;
      const insights = await database.all(
        "SELECT * FROM insights WHERE user_id = $1 ORDER BY created_at DESC",
        [userId],
      );
      const latestInsight = insights[0] || null;
      const feedback = latestInsight
        ? await database.get("SELECT * FROM feedback WHERE insight_id = $1", [latestInsight.id])
        : null;
      // Fetch recovery code (only returned for brand-new users so the frontend can show it once)
      let recoveryCode = null;
      if (isNew) {
        const user = await database.get("SELECT recovery_code FROM users WHERE id = $1", [userId]);
        recoveryCode = user?.recovery_code || null;
      }
      res.json({
        userId,
        isNewUser: isNew,
        recoveryCode,
        settings: await settingsFor(database, userId),
        baseline,
        sessions,
        latest,
        insight: latestInsight
          ? {
              id: latestInsight.id,
              weekStart: latestInsight.week_start,
              observation: latestInsight.observation,
              suggestion: latestInsight.suggestion,
              source: latestInsight.source,
              createdAt: latestInsight.created_at,
              feedback: feedback?.response || null,
            }
          : null,
        previousInsight: insights[1]
          ? {
              id: insights[1].id,
              observation: insights[1].observation,
              suggestion: insights[1].suggestion,
            }
          : null,
      });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to load state" });
    }
  });

  // ── Session recording (rate-limited, anonymous user) ───────────
  app.post("/api/sessions", sessionRateLimit, async (req, res) => {
    try {
      const userId = userIdFrom(req);
      await ensureUser(database, userId);
      const features = sanitizeSession(req.body);
      const historical = await sessionsFor(database, userId);
      const baseline = buildBaseline(historical);

      // Score this single session (for storage and recent-sessions table)
      const score = scoreSession(features, baseline);

      // Multi-session smoothing: average of last 3 sessions (including this one)
      // Used for weekly insights and intervention triggers
      const allSessions = [...historical, features];
      const smoothedScore = scoreSmoothed(allSessions, baseline);
      const smoothedDeviation = smoothedScore.deviation;
      const smoothedCombinedZ = smoothedScore._rawCombinedZ ?? null;

      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      await database.run(
        `INSERT INTO sessions (
          id, user_id, created_at, typing_speed, mean_pause_ms, pause_std_dev_ms,
          correction_rate, timing_variance, session_duration, deviation, dominant_feature, high_deviation,
          long_pause_rate, correction_burst_rate, speed_decay, smoothed_combined_z,
          session_duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          id,
          userId,
          createdAt,
          features.typingSpeed,
          features.meanPauseMs,
          features.pauseStdDevMs,
          features.correctionRate,
          features.timingVariance,
          features.sessionDuration,
          score.deviation,
          score.dominantFeature,
          score.highDeviation ? 1 : 0,
          features.longPauseRate ?? 0,
          features.correctionBurstRate ?? 0,
          features.speedDecay ?? 0,
          smoothedCombinedZ,
          features.sessionDurationMinutes ?? 0,
        ],
      );

      // Invalidate cached baseline (it changed with this new session)
      await invalidateBaseline(userId);

      res.json({
        id,
        createdAt,
        ...features,
        ...score,
        // Smoothed deviation for stable triggers (weekly insight uses this)
        smoothedDeviation,
        baseline,
      });
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message || "Session rejected" });
    }
  });

  // ── Weekly insight (rate-limited, anonymous user) ───────────────
  app.post("/api/insights/weekly", insightRateLimit, async (req, res) => {
    try {
      const userId = userIdFrom(req);
      await ensureUser(database, userId);
      const userSettings = await settingsFor(database, userId);
      const sessions = await sessionsFor(database, userId);
      const baseline = await getBaselineCached(database, userId, sessions);
      const latest = sessions.at(-1);
      const score = latest ? scoreSession(latest, baseline) : { ready: false };

      // Multi-session smoothing for stable weekly insights
      const smoothedScore = scoreSmoothed(sessions, baseline);
      const direction = score.ready ? summarizeDirection(score.zScores) : null;

      const week = weekStart(new Date().toISOString());
      const existing = await database.get(
        "SELECT * FROM insights WHERE user_id = $1 AND week_start = $2",
        [userId, week],
      );
      if (existing) {
        // BUG FIX: If baseline is now ready but the stored insight was generated
        // when it wasn't ("still learning" fallback), regenerate the insight.
        if (score.ready && existing.source === "fallback") {
          const refreshed = await generateInsight({
            score,
            smoothed: smoothedScore,
            direction,
            baseline: baseline.ready ? baseline.features : null,
            latest: latest
              ? {
                  typingSpeed: latest.typingSpeed,
                  meanPauseMs: latest.meanPauseMs,
                  pauseStdDevMs: latest.pauseStdDevMs,
                  correctionRate: latest.correctionRate,
                  timingVariance: latest.timingVariance,
                  longPauseRate: latest.longPauseRate,
                  correctionBurstRate: latest.correctionBurstRate,
                  speedDecay: latest.speedDecay,
                }
              : null,
            previousFeedback: null,
            supportLevel: userSettings.supportLevel,
          });
          // Update the stored insight with the refreshed version
          await database.run(
            "UPDATE insights SET observation = $1, suggestion = $2, source = $3 WHERE id = $4",
            [refreshed.observation, refreshed.suggestion, refreshed.source, existing.id],
          );
          return res.json({
            id: existing.id,
            observation: refreshed.observation,
            suggestion: refreshed.suggestion,
            source: refreshed.source,
            weekStart: existing.week_start,
            feedback: null,
          });
        }
        const fb = await database.get("SELECT * FROM feedback WHERE insight_id = $1", [existing.id]);
        return res.json({
          id: existing.id,
          observation: existing.observation,
          suggestion: existing.suggestion,
          source: existing.source,
          weekStart: existing.week_start,
          feedback: fb?.response || null,
        });
      }
      const previous = await database.get(
        "SELECT * FROM insights WHERE user_id = $1 ORDER BY created_at DESC",
        [userId],
      );
      const previousFeedback = previous
        ? (await database.get("SELECT * FROM feedback WHERE insight_id = $1", [previous.id]))?.response
        : null;
      const generated = await generateInsight({
        score,
        smoothed: smoothedScore,
        direction,
        baseline: baseline.ready ? baseline.features : null,
        latest: latest
          ? {
              typingSpeed: latest.typingSpeed,
              meanPauseMs: latest.meanPauseMs,
              pauseStdDevMs: latest.pauseStdDevMs,
              correctionRate: latest.correctionRate,
              timingVariance: latest.timingVariance,
              longPauseRate: latest.longPauseRate,
              correctionBurstRate: latest.correctionBurstRate,
              speedDecay: latest.speedDecay,
            }
          : null,
        previousFeedback,
        supportLevel: userSettings.supportLevel,
      });
      const id = crypto.randomUUID();
      await database.run(
        `INSERT INTO insights (id, user_id, week_start, observation, suggestion, source, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, userId, week, generated.observation, generated.suggestion, generated.source, new Date().toISOString()],
      );
      res.json({ id, ...generated, weekStart: week, feedback: null });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to write insight" });
    }
  });

  // ── Feedback (rate-limited, anonymous user) ────────────────────
  app.post("/api/feedback", feedbackRateLimit, async (req, res) => {
    try {
      const userId = userIdFrom(req);
      const allowed = ["a_little", "not_really", "not_sure"];
      const response = String(req.body?.response || "");
      const insightId = String(req.body?.insightId || "");
      if (!allowed.includes(response)) {
        return res.status(400).json({ error: "Unknown feedback" });
      }
      const insight = await database.get(
        "SELECT * FROM insights WHERE id = $1 AND user_id = $2",
        [insightId, userId],
      );
      if (!insight) return res.status(404).json({ error: "Insight not found" });
      const existing = await database.get("SELECT * FROM feedback WHERE insight_id = $1", [insightId]);
      if (existing) {
        await database.run("UPDATE feedback SET response = $1, created_at = $2 WHERE id = $3", [
          response,
          new Date().toISOString(),
          existing.id,
        ]);
      } else {
        await database.run(
          "INSERT INTO feedback (id, insight_id, user_id, response, created_at) VALUES ($1, $2, $3, $4, $5)",
          [crypto.randomUUID(), insightId, userId, response, new Date().toISOString()],
        );
      }
      res.json({ ok: true, response });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to save feedback" });
    }
  });

  // ── Get my recovery code (anonymous user) ──────────────────────
  app.get("/api/me/recovery-code", async (req, res) => {
    try {
      const userId = userIdFrom(req);
      const user = await database.get(
        "SELECT recovery_code FROM users WHERE id = $1",
        [userId],
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ recoveryCode: user.recovery_code });
    } catch (error) {
      res.status(500).json({ error: "Could not fetch recovery code" });
    }
  });

  // ── Settings (anonymous user) ──────────────────────────────────
  app.put("/api/settings", generalWriteRateLimit, async (req, res) => {
    try {
      const userId = userIdFrom(req);
      await ensureUser(database, userId);
      const supportLevel = ["awareness", "suggestions", "connection"].includes(req.body?.supportLevel)
        ? req.body.supportLevel
        : "suggestions";
      const trustedName = String(req.body?.trustedName || "").slice(0, 80);
      const trustedChannel = String(req.body?.trustedChannel || "").slice(0, 40);
      const campusOptIn = req.body?.campusOptIn === false ? 0 : 1;
      await database.run(
        `UPDATE settings SET support_level = $1, trusted_name = $2, trusted_channel = $3, campus_opt_in = $4, updated_at = $5
         WHERE user_id = $6`,
        [supportLevel, trustedName, trustedChannel, campusOptIn, new Date().toISOString(), userId],
      );
      res.json(await settingsFor(database, userId));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to save settings" });
    }
  });

  // ── Campus Pulse (aggregate, anonymous user) ──────────────────
  app.get("/api/campus", async (req, res) => {
    try {
      userIdFrom(req);
      const rows = (
        await database.all(
          `SELECT s.user_id as "userId", s.created_at as "createdAt", s.deviation as deviation
           FROM sessions s
           JOIN settings st ON st.user_id = s.user_id
           WHERE st.campus_opt_in = 1 AND s.deviation IS NOT NULL`,
        )
      ).map((row) => ({
        userId: row.userId,
        createdAt: row.createdAt,
        deviation: row.deviation,
      }));
      const pulse = campusAggregate(rows, MIN_GROUP_SIZE);
      if (pulse.withheld) {
        return res.status(403).json(pulse);
      }
      res.json({
        ...pulse,
        privacy: "Aggregate data only. Individual users are never shown here.",
      });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Campus pulse unavailable" });
    }
  });

  // ── Data export (anonymous user) ───────────────────────────────
  app.get("/api/export", async (req, res) => {
    try {
      const userId = userIdFrom(req);
      const sessions = await sessionsFor(database, userId);
      const baseline = buildBaseline(sessions.slice(0, -1));
      const insights = await database.all(
        "SELECT * FROM insights WHERE user_id = $1 ORDER BY created_at ASC",
        [userId],
      );
      const feedback = await database.all("SELECT * FROM feedback WHERE user_id = $1", [userId]);
      const payload = {
        exportedAt: new Date().toISOString(),
        userId,
        containsJournalText: false,
        settings: await settingsFor(database, userId),
        baseline,
        sessions,
        insights: insights.map((row) => ({
          id: row.id,
          weekStart: row.week_start,
          observation: row.observation,
          suggestion: row.suggestion,
          source: row.source,
          createdAt: row.created_at,
        })),
        feedback: feedback.map((row) => ({
          insightId: row.insight_id,
          response: row.response,
          createdAt: row.created_at,
        })),
      };
      res.setHeader("Content-Disposition", "attachment; filename=bhaav-export.json");
      res.json(payload);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Export failed" });
    }
  });

  // ── Delete all user data (anonymous user) ──────────────────────
  app.delete("/api/me", generalWriteRateLimit, async (req, res) => {
    try {
      const userId = userIdFrom(req);
      await database.run("DELETE FROM feedback WHERE user_id = $1", [userId]);
      await database.run("DELETE FROM insights WHERE user_id = $1", [userId]);
      await database.run("DELETE FROM sessions WHERE user_id = $1", [userId]);
      await database.run("DELETE FROM settings WHERE user_id = $1", [userId]);
      await database.run("DELETE FROM users WHERE id = $1", [userId]);
      await invalidateBaseline(userId);
      res.json({ ok: true, deleted: true });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Delete failed" });
    }
  });

  // ── Demo seed (anonymous user) ─────────────────────────────────
  app.post("/api/demo/seed", generalWriteRateLimit, async (req, res) => {
    try {
      userIdFrom(req);
      await invalidateAllBaselines();
      const result = await seedDatabase(database);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ error: "Seed failed" });
    }
  });

  // ── SPA fallback — serve index.html for any non-API route ──────
  const indexPath = path.join(clientDist, "index.html");
  try {
    const { default: fs } = await import("node:fs");
    if (fs.existsSync(indexPath)) {
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api")) {
          return res.status(404).json({ error: "Not found" });
        }
        res.sendFile(indexPath);
      });
    }
  } catch { /* no-op */ }

  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: "Unexpected error" });
  });

  // ── Campus Pulse: per-user opt-in (anonymous user) ─────────────
  app.post("/api/settings/campus-pulse-opt-in", generalWriteRateLimit, async (req, res) => {
    try {
      const userId = userIdFrom(req);
      await ensureUser(database, userId);
      const optIn = req.body?.opt_in === true ? 1 : 0;
      await database.run("UPDATE users SET campus_pulse_opt_in = $1 WHERE id = $2", [optIn, userId]);
      res.json({ ok: true, campus_pulse_opt_in: optIn });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to update campus pulse opt-in" });
    }
  });

  // ── Campus Pulse: anonymous peer-count (anonymous user) ────────
  app.get("/api/campus-pulse/peer-count/:userId", async (req, res) => {
    try {
      const requestingUserId = assertUserId(req.params.userId);

      const user = await database.get(
        "SELECT campus_pulse_opt_in FROM users WHERE id = $1",
        [requestingUserId],
      );
      if (!user || !user.campus_pulse_opt_in) {
        return res.json({ opted_in: false });
      }

      const latestSession = await database.get(
        "SELECT deviation FROM sessions WHERE user_id = $1 AND deviation IS NOT NULL ORDER BY created_at DESC",
        [requestingUserId],
      );
      if (!latestSession) {
        return res.json({ opted_in: true, insufficient_data: true });
      }

      const z = latestSession.deviation;
      let tier;
      if (z >= HIGH_DEVIATION) tier = "high";
      else if (z >= 1.0) tier = "moderate";
      else tier = "normal";

      const week = weekStart(new Date().toISOString());
      const tierRows = await database.all(
        `SELECT s.user_id, s.deviation
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE u.campus_pulse_opt_in = 1
           AND s.user_id != $1
           AND s.deviation IS NOT NULL
           AND s.created_at >= $2`,
        [requestingUserId, week],
      );

      let peerCount = 0;
      for (const row of tierRows) {
        const dz = row.deviation;
        let rowTier;
        if (dz >= HIGH_DEVIATION) rowTier = "high";
        else if (dz >= 1.0) rowTier = "moderate";
        else rowTier = "normal";
        if (rowTier === tier) peerCount++;
      }

      if (peerCount < MIN_GROUP_SIZE) {
        return res.json({ opted_in: true, insufficient_data: true });
      }

      res.json({ opted_in: true, insufficient_data: false, peer_count: peerCount, tier });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Peer count unavailable" });
    }
  });

  return app;
}

// ═══════════════════════════════════════════════════════════════════
// BOOTSTRAP — only runs when invoked directly (not in tests)
// ═══════════════════════════════════════════════════════════════════
const isMain = process.argv[1] && path.normalize(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  // Use Neon serverless if DATABASE_URL is set, otherwise fall back to SQLite
  let database;
  if (process.env.DATABASE_URL) {
    const neonDb = await import("./neon.js");
    database = await neonDb.createDatabase();
  } else {
    database = await createSqliteDatabase(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/bhaav.sqlite")
    );
  }
  if (process.env.DATABASE_URL) await initCache();

  // Seed demo data if database is empty (and DEMO_SEED != "false")
  if (process.env.DEMO_SEED !== "false") {
    const count = await database.get("SELECT COUNT(*)::int AS n FROM sessions");
    if (!count?.n) await seedDatabase(database);
  }

  const app = await createApp(database);
  const server = app.listen(PORT, () => {
    process.stdout.write(`Bhaav listening on ${PORT}\n`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────
  // Ensures no in-flight requests are dropped mid-transaction.
  async function shutdown(signal) {
    process.stdout.write(`\n${signal} received — shutting down gracefully…\n`);
    server.close(async () => {
      await closeCache();
      process.stdout.write("Goodbye.\n");
      process.exit(0);
    });
    // Force kill after 10s if graceful shutdown stalls
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
