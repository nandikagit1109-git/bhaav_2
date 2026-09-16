import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rowToSession } from "./pg.js";
import { buildBaseline, scoreSession, weekStart } from "./stats.js";
import { fallbackInsight } from "./insights.js";

const DEMO_USER = "demo";

function daysAgo(n, hour = 19) {
  const d = new Date();
  d.setHours(hour, 12, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function session(partial, days, hour) {
  return {
    typingSpeed: 48,
    meanPauseMs: 410,
    pauseStdDevMs: 175,
    correctionRate: 0.055,
    timingVariance: 0.11,
    sessionDuration: 540,
    ...partial,
    createdAt: daysAgo(days, hour),
  };
}

const DEMO_STORY = [
  session({}, 24, 18),
  session({ typingSpeed: 47.2, meanPauseMs: 398 }, 22, 19),
  session({ typingSpeed: 49.1, meanPauseMs: 422, sessionDuration: 610 }, 20, 20),
  session({ typingSpeed: 44.6, meanPauseMs: 518, pauseStdDevMs: 210, timingVariance: 0.15 }, 17, 21),
  session({ typingSpeed: 48.4, meanPauseMs: 405, sessionDuration: 500 }, 15, 18),
  session({ typingSpeed: 46.9, meanPauseMs: 416, correctionRate: 0.06 }, 13, 19),
  session(
    {
      typingSpeed: 31.4,
      meanPauseMs: 860,
      pauseStdDevMs: 390,
      correctionRate: 0.12,
      timingVariance: 0.29,
      sessionDuration: 720,
    },
    8,
    23,
  ),
  session(
    {
      typingSpeed: 38.2,
      meanPauseMs: 640,
      pauseStdDevMs: 280,
      correctionRate: 0.09,
      timingVariance: 0.2,
      sessionDuration: 580,
    },
    5,
    20,
  ),
  session({ typingSpeed: 45.5, meanPauseMs: 448, timingVariance: 0.13 }, 4, 19),
  session({ typingSpeed: 47.8, meanPauseMs: 401, sessionDuration: 560 }, 3, 18),
  session({ typingSpeed: 46.1, meanPauseMs: 430, pauseStdDevMs: 188 }, 2, 19),
  session(
    {
      typingSpeed: 36.8,
      meanPauseMs: 705,
      pauseStdDevMs: 310,
      correctionRate: 0.1,
      timingVariance: 0.22,
      sessionDuration: 640,
    },
    1,
    21,
  ),
];

async function insertSession(database, userId, data) {
  const historical = (await database
    .all("SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at ASC", [userId]))
    .map(rowToSession);
  const baseline = buildBaseline(historical);
  const score = scoreSession(data, baseline);
  const id = crypto.randomUUID();
  await database.run(
    `INSERT INTO sessions (
      id, user_id, created_at, typing_speed, mean_pause_ms, pause_std_dev_ms,
      correction_rate, timing_variance, session_duration, deviation, dominant_feature, high_deviation
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      userId,
      data.createdAt,
      data.typingSpeed,
      data.meanPauseMs,
      data.pauseStdDevMs,
      data.correctionRate,
      data.timingVariance,
      data.sessionDuration,
      score.deviation,
      score.dominantFeature,
      score.highDeviation ? 1 : 0,
    ],
  );
  return id;
}

async function ensureUser(database, userId, supportLevel = "suggestions") {
  const existing = await database.get("SELECT id FROM users WHERE id = $1", [userId]);
  if (!existing) {
    await database.run("INSERT INTO users (id, created_at) VALUES ($1, $2)", [userId, new Date().toISOString()]);
  }
  await database.run(
    `INSERT INTO settings (user_id, support_level, trusted_name, trusted_channel, campus_opt_in, updated_at)
     VALUES ($1, $2, $3, $4, 1, $5)
     ON CONFLICT (user_id) DO UPDATE SET campus_opt_in = 1`,
    [userId, supportLevel, userId === DEMO_USER ? "Riya" : "", "sms", new Date().toISOString()],
  );
}

export async function seedDatabase(database) {
  await database.run("DELETE FROM feedback");
  await database.run("DELETE FROM insights");
  await database.run("DELETE FROM sessions");
  await database.run("DELETE FROM settings");
  await database.run("DELETE FROM users");

  await ensureUser(database, DEMO_USER, "connection");
  for (const row of DEMO_STORY) await insertSession(database, DEMO_USER, row);

  const insightId = crypto.randomUUID();
  const priorInsightId = crypto.randomUUID();
  const week = weekStart(new Date().toISOString());
  const priorWeekDate = new Date();
  priorWeekDate.setDate(priorWeekDate.getDate() - 7);
  const priorWeek = weekStart(priorWeekDate.toISOString());
  const copy = fallbackInsight({
    score: { ready: true, deviation: 1.9, dominantFeature: "meanPauseMs" },
    previousFeedback: "a_little",
    supportLevel: "connection",
  });

  await database.run(
    `INSERT INTO insights (id, user_id, week_start, observation, suggestion, source, created_at)
     VALUES ($1, $2, $3, $4, $5, 'fallback', $6)`,
    [
      priorInsightId,
      DEMO_USER,
      priorWeek,
      "Last week your writing rhythm had more stops than your usual pattern.",
      "Try one uninterrupted 10-minute writing session before your next busy block.",
      daysAgo(7, 9),
    ],
  );
  await database.run(
    `INSERT INTO feedback (id, insight_id, user_id, response, created_at) VALUES ($1, $2, $3, 'a_little', $4)`,
    [crypto.randomUUID(), priorInsightId, DEMO_USER, daysAgo(6, 12)],
  );
  await database.run(
    `INSERT INTO insights (id, user_id, week_start, observation, suggestion, source, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [insightId, DEMO_USER, week, copy.observation, copy.suggestion, copy.source, daysAgo(0, 8)],
  );

  // Each campus user needs >= MIN_BASELINE_SESSIONS (6) sessions to have non-null deviation
  for (let i = 1; i <= 16; i += 1) {
    const id = `campus-${String(i).padStart(2, "0")}`;
    await ensureUser(database, id, "awareness");
    const bump = i > 10 ? 0.35 : 0;
    // Insert 7 sessions per campus user spread over time
    for (let j = 0; j < 7; j += 1) {
      await insertSession(database, id, {
        typingSpeed: 45 + (i % 5) + (j % 3) * 0.5,
        meanPauseMs: 390 + i * 8 + bump * 200 + (j % 2 === 0 ? 20 : -10),
        pauseStdDevMs: 160 + i * 4 + j * 3,
        correctionRate: 0.05 + (i % 4) * 0.004,
        timingVariance: 0.1 + bump + j * 0.005,
        sessionDuration: 400 + i * 10 + j * 20,
        createdAt: daysAgo(14 - j, 16 + (i % 4)),
      });
    }
    // One recent session with slight deviation for higher-numbered users
    if (i > 10) {
      await insertSession(database, id, {
        typingSpeed: 42,
        meanPauseMs: 560,
        pauseStdDevMs: 250,
        correctionRate: 0.08,
        timingVariance: 0.18,
        sessionDuration: 520,
        createdAt: daysAgo(1, 20),
      });
    }
  }

  return { userId: DEMO_USER, sessions: DEMO_STORY.length };
}

export { DEMO_USER };

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.normalize(process.argv[1]);
if (isMain) {
  const { createDatabase } = await import("./pg.js");
  const database = await createDatabase();
  const result = await seedDatabase(database);
  process.stdout.write(`Seeded ${result.sessions} sessions for ${result.userId}\n`);
  await database.pool.end();
}
