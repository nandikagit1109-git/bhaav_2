import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createDatabase, rowToSession } from "./db.js";
import { buildBaseline, campusAggregate, scoreSession, weekStart } from "./stats.js";
import { generateInsight } from "./insights.js";
import { assertUserId, sanitizeSession } from "./validate.js";
import { seedDatabase } from "./seed.js";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

const MIN_GROUP_SIZE = Number(process.env.MIN_GROUP_SIZE || 10);
const PORT = Number(process.env.PORT || 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

function userIdFrom(req) {
  return assertUserId(req.header("x-bhaav-user") || "demo");
}

function ensureUser(db, userId) {
  if (!db.get("SELECT id FROM users WHERE id = ?", [userId])) {
    db.run("INSERT INTO users (id, created_at) VALUES (?, ?)", [userId, new Date().toISOString()]);
  }
  if (!db.get("SELECT user_id FROM settings WHERE user_id = ?", [userId])) {
    db.run(
      `INSERT INTO settings (user_id, support_level, trusted_name, trusted_channel, campus_opt_in, updated_at)
       VALUES (?, 'suggestions', '', '', 1, ?)`,
      [userId, new Date().toISOString()],
    );
  }
}

function sessionsFor(db, userId) {
  return db
    .all("SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at ASC", [userId])
    .map(rowToSession);
}

function settingsFor(db, userId) {
  ensureUser(db, userId);
  const row = db.get("SELECT * FROM settings WHERE user_id = ?", [userId]);
  return {
    supportLevel: row.support_level,
    trustedName: row.trusted_name,
    trustedChannel: row.trusted_channel,
    campusOptIn: Boolean(row.campus_opt_in),
  };
}

export function createApp(database) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use(
    cors({
      origin: CLIENT_ORIGIN,
      allowedHeaders: ["Content-Type", "x-bhaav-user"],
    }),
  );

  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, name: "bhaav", storesJournalText: false });
  });

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

  app.get("/api/state", (req, res) => {
    try {
      const userId = userIdFrom(req);
      ensureUser(database, userId);
      const sessions = sessionsFor(database, userId);
      const prior = sessions.slice(0, -1);
      const baseline = buildBaseline(prior.length ? prior : sessions.slice(0, 0));
      const latest = sessions.at(-1) || null;
      const insights = database.all(
        "SELECT * FROM insights WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
      );
      const latestInsight = insights[0] || null;
      const feedback = latestInsight
        ? database.get("SELECT * FROM feedback WHERE insight_id = ?", [latestInsight.id])
        : null;
      res.json({
        userId,
        settings: settingsFor(database, userId),
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

  app.post("/api/sessions", (req, res) => {
    try {
      const userId = userIdFrom(req);
      ensureUser(database, userId);
      const features = sanitizeSession(req.body);
      const historical = sessionsFor(database, userId);
      const baseline = buildBaseline(historical);
      const score = scoreSession(features, baseline);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      database.run(
        `INSERT INTO sessions (
          id, user_id, created_at, typing_speed, mean_pause_ms, pause_std_dev_ms,
          correction_rate, timing_variance, session_duration, deviation, dominant_feature, high_deviation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ],
      );
      res.json({
        id,
        createdAt,
        ...features,
        ...score,
        baseline,
      });
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message || "Session rejected" });
    }
  });

  app.post("/api/insights/weekly", async (req, res) => {
    try {
      const userId = userIdFrom(req);
      ensureUser(database, userId);
      const settings = settingsFor(database, userId);
      const sessions = sessionsFor(database, userId);
      const baseline = buildBaseline(sessions.slice(0, -1));
      const latest = sessions.at(-1);
      const score = latest ? scoreSession(latest, baseline) : { ready: false };
      const week = weekStart(new Date().toISOString());
      const existing = database.get("SELECT * FROM insights WHERE user_id = ? AND week_start = ?", [
        userId,
        week,
      ]);
      if (existing) {
        const fb = database.get("SELECT * FROM feedback WHERE insight_id = ?", [existing.id]);
        return res.json({
          id: existing.id,
          observation: existing.observation,
          suggestion: existing.suggestion,
          source: existing.source,
          weekStart: existing.week_start,
          feedback: fb?.response || null,
        });
      }
      const previous = database.get(
        "SELECT * FROM insights WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
      );
      const previousFeedback = previous
        ? database.get("SELECT * FROM feedback WHERE insight_id = ?", [previous.id])?.response
        : null;
      const generated = await generateInsight({
        score,
        baseline: baseline.ready ? baseline.features : null,
        latest: latest
          ? {
              typingSpeed: latest.typingSpeed,
              meanPauseMs: latest.meanPauseMs,
              pauseStdDevMs: latest.pauseStdDevMs,
              correctionRate: latest.correctionRate,
              timingVariance: latest.timingVariance,
            }
          : null,
        previousFeedback,
        supportLevel: settings.supportLevel,
      });
      const id = crypto.randomUUID();
      database.run(
        `INSERT INTO insights (id, user_id, week_start, observation, suggestion, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, week, generated.observation, generated.suggestion, generated.source, new Date().toISOString()],
      );
      res.json({ id, ...generated, weekStart: week, feedback: null });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to write insight" });
    }
  });

  app.post("/api/feedback", (req, res) => {
    try {
      const userId = userIdFrom(req);
      const allowed = ["a_little", "not_really", "not_sure"];
      const response = String(req.body?.response || "");
      const insightId = String(req.body?.insightId || "");
      if (!allowed.includes(response)) {
        return res.status(400).json({ error: "Unknown feedback" });
      }
      const insight = database.get("SELECT * FROM insights WHERE id = ? AND user_id = ?", [
        insightId,
        userId,
      ]);
      if (!insight) return res.status(404).json({ error: "Insight not found" });
      const existing = database.get("SELECT * FROM feedback WHERE insight_id = ?", [insightId]);
      if (existing) {
        database.run("UPDATE feedback SET response = ?, created_at = ? WHERE id = ?", [
          response,
          new Date().toISOString(),
          existing.id,
        ]);
      } else {
        database.run(
          "INSERT INTO feedback (id, insight_id, user_id, response, created_at) VALUES (?, ?, ?, ?, ?)",
          [crypto.randomUUID(), insightId, userId, response, new Date().toISOString()],
        );
      }
      res.json({ ok: true, response });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to save feedback" });
    }
  });

  app.put("/api/settings", (req, res) => {
    try {
      const userId = userIdFrom(req);
      ensureUser(database, userId);
      const supportLevel = ["awareness", "suggestions", "connection"].includes(req.body?.supportLevel)
        ? req.body.supportLevel
        : "suggestions";
      const trustedName = String(req.body?.trustedName || "").slice(0, 80);
      const trustedChannel = String(req.body?.trustedChannel || "").slice(0, 40);
      const campusOptIn = req.body?.campusOptIn === false ? 0 : 1;
      database.run(
        `UPDATE settings SET support_level = ?, trusted_name = ?, trusted_channel = ?, campus_opt_in = ?, updated_at = ?
         WHERE user_id = ?`,
        [supportLevel, trustedName, trustedChannel, campusOptIn, new Date().toISOString(), userId],
      );
      res.json(settingsFor(database, userId));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to save settings" });
    }
  });

  app.get("/api/campus", (req, res) => {
    try {
      userIdFrom(req);
      const rows = database
        .all(
          `SELECT s.user_id as userId, s.created_at as createdAt, s.deviation as deviation
           FROM sessions s
           JOIN settings st ON st.user_id = s.user_id
           WHERE st.campus_opt_in = 1 AND s.deviation IS NOT NULL`,
        )
        .map((row) => ({
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

  app.get("/api/export", (req, res) => {
    try {
      const userId = userIdFrom(req);
      const sessions = sessionsFor(database, userId);
      const baseline = buildBaseline(sessions.slice(0, -1));
      const insights = database.all("SELECT * FROM insights WHERE user_id = ? ORDER BY created_at ASC", [
        userId,
      ]);
      const feedback = database.all("SELECT * FROM feedback WHERE user_id = ?", [userId]);
      const payload = {
        exportedAt: new Date().toISOString(),
        userId,
        containsJournalText: false,
        settings: settingsFor(database, userId),
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

  app.delete("/api/me", (req, res) => {
    try {
      const userId = userIdFrom(req);
      database.run("DELETE FROM feedback WHERE user_id = ?", [userId]);
      database.run("DELETE FROM insights WHERE user_id = ?", [userId]);
      database.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
      database.run("DELETE FROM settings WHERE user_id = ?", [userId]);
      database.run("DELETE FROM users WHERE id = ?", [userId]);
      res.json({ ok: true, deleted: true });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : "Delete failed" });
    }
  });

  app.post("/api/demo/seed", (req, res) => {
    try {
      userIdFrom(req);
      const result = seedDatabase(database);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ error: "Seed failed" });
    }
  });

  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: "Unexpected error" });
  });

  return app;
}

const isMain = process.argv[1] && path.normalize(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/bhaav.sqlite");
  const database = await createDatabase(dataFile);
  if (process.env.DEMO_SEED !== "false") {
    const count = database.get("SELECT COUNT(*) as n FROM sessions");
    if (!count?.n) seedDatabase(database);
  }
  const app = createApp(database);
  app.listen(PORT, () => {
    process.stdout.write(`Bhaav listening on ${PORT}\n`);
  });
}
