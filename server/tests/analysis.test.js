import test from "node:test";
import assert from "node:assert/strict";
import {
  extractFeatures,
  FEATURE_KEYS,
  ORIGINAL_FEATURE_KEYS,
  FEATURE_DIRECTION,
  FEATURE_BOUNDS,
} from "../lib/featureExtraction.js";
import {
  median,
  mad,
  weightedMedianMad,
  madZScore,
  buildBaseline,
  scoreSession,
  rollingAverage,
  scoreSmoothed,
  summarizeDirection,
} from "../lib/baseline.js";
import { sanitizeSession } from "../lib/validate.js";
import { fallbackInsight, insightPrompt } from "../lib/insights.js";

// ═══════════════════════════════════════════════════════════════════
// Feature Extraction Tests
// ═══════════════════════════════════════════════════════════════════

test("extractFeatures returns 8 features from raw events", () => {
  const now = Date.now();
  const events = [];
  // Generate 100 keydown events over 30 seconds
  for (let i = 0; i < 100; i++) {
    events.push({
      type: "keydown",
      key: "a",
      timestamp: now + i * 300, // 300ms apart
    });
  }
  // Add some backspaces
  for (let i = 0; i < 5; i++) {
    events.push({
      type: "keydown",
      key: "Backspace",
      timestamp: now + (100 + i) * 300,
    });
  }

  const features = extractFeatures({ events });

  // Should have all 8 features
  for (const key of FEATURE_KEYS) {
    assert.ok(key in features, `Missing feature: ${key}`);
    assert.ok(Number.isFinite(features[key]), `Non-finite value for ${key}: ${features[key]}`);
  }

  // Original features should have reasonable values
  assert.ok(features.typingSpeed > 0, "typingSpeed should be positive");
  assert.ok(features.meanPauseMs >= 0, "meanPauseMs should be non-negative");
  assert.ok(features.correctionRate >= 0, "correctionRate should be non-negative");
  assert.ok(features.correctionRate <= 1, "correctionRate should be <= 1");
});

test("extractFeatures handles short event lists gracefully", () => {
  const features = extractFeatures({ events: [] });
  assert.ok(Number.isFinite(features.typingSpeed));
  assert.ok(features.typingSpeed === 0);
});

test("extractFeatures computes longPauseRate correctly", () => {
  const now = Date.now();
  const events = [];
  // Create events with a long pause (>5000ms)
  for (let i = 0; i < 10; i++) {
    events.push({
      type: "keydown",
      key: "a",
      timestamp: now + i * 1000, // 1s apart
    });
  }
  // Add a 6-second gap
  events.push({
    type: "keydown",
    key: "a",
    timestamp: now + 10 * 1000 + 6000, // 6s pause
  });
  // More events
  for (let i = 1; i <= 5; i++) {
    events.push({
      type: "keydown",
      key: "a",
      timestamp: now + 10 * 1000 + 6000 + i * 1000,
    });
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  const features = extractFeatures({ events });

  // There should be at least one pause >5000ms
  assert.ok(features.longPauseRate > 0, "longPauseRate should be > 0 with a 6s pause");
  assert.ok(features.longPauseRate <= 1, "longPauseRate should be <= 1");
});

test("extractFeatures computes correctionBurstRate correctly", () => {
  const now = Date.now();
  const events = [];
  // Normal typing
  for (let i = 0; i < 20; i++) {
    events.push({
      type: "keydown",
      key: "a",
      timestamp: now + i * 200,
    });
  }
  // A burst of 5 consecutive backspaces
  for (let i = 0; i < 5; i++) {
    events.push({
      type: "keydown",
      key: "Backspace",
      timestamp: now + 20 * 200 + i * 100,
    });
  }
  // More typing
  for (let i = 0; i < 10; i++) {
    events.push({
      type: "keydown",
      key: "a",
      timestamp: now + 20 * 200 + 5 * 100 + i * 200,
    });
  }

  const features = extractFeatures({ events });

  // Should have a burst rate > 0 (5 backspaces in a burst)
  assert.ok(features.correctionBurstRate > 0, "correctionBurstRate should be > 0");
  assert.ok(features.correctionBurstRate <= 1, "correctionBurstRate should be <= 1");
});

test("extractFeatures computes speedDecay correctly", () => {
  const now = Date.now();
  const events = [];

  // First half: fast typing (100ms apart)
  for (let i = 0; i < 50; i++) {
    events.push({
      type: "keydown",
      key: "a",
      timestamp: now + i * 100,
    });
  }

  // Second half: slow typing (500ms apart)
  for (let i = 0; i < 50; i++) {
    events.push({
      type: "keydown",
      key: "a",
      timestamp: now + 50 * 100 + i * 500,
    });
  }

  const features = extractFeatures({ events });

  // Positive speedDecay = slowing down
  assert.ok(features.speedDecay > 0, "speedDecay should be > 0 when slowing down");
});

test("extractFeatures falls back to pre-computed values", () => {
  const features = extractFeatures({
    typingSpeed: 45,
    meanPauseMs: 300,
    sessionDuration: 120,
  });

  assert.equal(features.typingSpeed, 45);
  assert.equal(features.meanPauseMs, 300);
  assert.equal(features.sessionDuration, 120);
});

// ═══════════════════════════════════════════════════════════════════
// Baseline (Median/MAD) Tests
// ═══════════════════════════════════════════════════════════════════

test("median computes correctly", () => {
  assert.equal(median([1, 2, 3, 4, 5]), 3);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([5]), 5);
  assert.equal(median([]), 0);
});

test("mad computes correctly", () => {
  // MAD of [1,2,3,4,5] = median(|1-3|,|2-3|,|3-3|,|4-3|,|5-3|) = median(2,1,0,1,2) = 1
  assert.equal(mad([1, 2, 3, 4, 5]), 1);
});

test("weightedMedianMad computes correctly", () => {
  const values = [10, 20, 30, 40, 50];
  const weights = [1, 1, 1, 1, 1];
  const { median: med, mad: m } = weightedMedianMad(values, weights);
  assert.equal(med, 30);
  assert.ok(m > 0);
});

test("weightedMedianMad applies recency weighting", () => {
  // Test that weights affect the median calculation
  const values = [10, 20, 30, 40, 50];
  const weightsEqual = [1, 1, 1, 1, 1];
  const weightsSkewed = [1, 1, 1, 1, 3]; // Heavy weight on 50
  const { median: medEqual } = weightedMedianMad(values, weightsEqual);
  const { median: medSkewed } = weightedMedianMad(values, weightsSkewed);
  // With heavier weight on 50, median should shift right
  assert.ok(medSkewed >= medEqual, "Weighted median should shift toward higher-weighted values");
});

test("madZScore computes correctly", () => {
  // z = 0.6745 * (x - median) / MAD
  // For x=3, median=3, MAD=1: z = 0
  assert.equal(madZScore(3, 3, 1), 0);

  // For x=5, median=3, MAD=1: z = 0.6745 * 2 = 1.349
  const z = madZScore(5, 3, 1);
  assert.ok(Math.abs(z - 1.349) < 0.01);
});

test("madZScore returns 0 when MAD is 0", () => {
  assert.equal(madZScore(100, 50, 0), 0);
});

// ═══════════════════════════════════════════════════════════════════
// Baseline Builder Tests
// ═══════════════════════════════════════════════════════════════════

test("buildBaseline not ready with fewer than MIN_BASELINE_SESSIONS", () => {
  const sessions = Array.from({ length: 3 }, () => ({
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  }));
  const baseline = buildBaseline(sessions);
  assert.equal(baseline.ready, false);
});

test("buildBaseline ready with enough sessions", () => {
  const sessions = Array.from({ length: 10 }, (_, i) => ({
    typingSpeed: 40 + i,
    meanPauseMs: 400 + i * 10,
    pauseStdDevMs: 150 + i,
    correctionRate: 0.05 + i * 0.01,
    timingVariance: 0.1 + i * 0.01,
    longPauseRate: 0.1 + i * 0.02,
    correctionBurstRate: 0.02 + i * 0.005,
    speedDecay: 0.05 + i * 0.01,
  }));
  const baseline = buildBaseline(sessions);
  assert.equal(baseline.ready, true);
  assert.equal(baseline.sessionCount, 10);

  // Should have stats for all 8 features
  for (const key of FEATURE_KEYS) {
    assert.ok(key in baseline.features, `Missing feature in baseline: ${key}`);
    assert.ok("median" in baseline.features[key], `Missing median for ${key}`);
    assert.ok("mad" in baseline.features[key], `Missing mad for ${key}`);
  }
});

test("baseline uses recency weighting (last 5 sessions count 2x)", () => {
  // Create sessions where last 5 are very different from first 5
  const sessions = [
    // First 5: typingSpeed = 40
    ...Array.from({ length: 5 }, () => ({
      typingSpeed: 40,
      meanPauseMs: 400,
      pauseStdDevMs: 150,
      correctionRate: 0.05,
      timingVariance: 0.1,
      longPauseRate: 0.1,
      correctionBurstRate: 0.02,
      speedDecay: 0.05,
    })),
    // Last 5: typingSpeed = 80
    ...Array.from({ length: 5 }, () => ({
      typingSpeed: 80,
      meanPauseMs: 400,
      pauseStdDevMs: 150,
      correctionRate: 0.05,
      timingVariance: 0.1,
      longPauseRate: 0.1,
      correctionBurstRate: 0.02,
      speedDecay: 0.05,
    })),
  ];

  const baseline = buildBaseline(sessions);

  // With recency weighting, median should shift toward 80
  // (last 5 sessions have weight 2.0, first 5 have weight 1.0)
  assert.ok(baseline.features.typingSpeed.median > 50,
    "Median should shift toward recent values with recency weighting");
});

// ═══════════════════════════════════════════════════════════════════
// Directional Deviation Scoring Tests
// ═══════════════════════════════════════════════════════════════════

test("scoreSession returns not ready when baseline not ready", () => {
  const result = scoreSession({ typingSpeed: 40 }, { ready: false });
  assert.equal(result.ready, false);
  assert.equal(result.deviation, null);
});

test("scoreSession dampens deviation for low session count", () => {
  const sessions = Array.from({ length: 6 }, (_, i) => ({
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  }));
  const baseline = buildBaseline(sessions);

  // Session with very different typing speed
  const session = {
    typingSpeed: 20, // Much slower
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  };

  const result = scoreSession(session, baseline);

  // Confidence should be low (only 6 sessions, just barely ready)
  // confidence = min(1, (6 - 6) / 10) = 0
  assert.ok(result._confidence < 0.1, "Confidence should be low with only 6 sessions");

  // Deviation should be dampened
  assert.ok(result.deviation >= 0);
  assert.ok(result.deviation < 8);
});

test("scoreSession full confidence with many sessions", () => {
  const sessions = Array.from({ length: 20 }, () => ({
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  }));
  const baseline = buildBaseline(sessions);

  const session = {
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  };

  const result = scoreSession(session, baseline);

  // confidence = min(1, (20 - 6) / 10) = 1.4 -> clamped to 1
  assert.equal(result._confidence, 1);

  // Similar session should have low deviation
  assert.ok(result.deviation < 0.5, "Similar session should have low deviation");
});

test("directional scoring: faster session does not flag as concerning", () => {
  const sessions = Array.from({ length: 15 }, () => ({
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  }));
  const baseline = buildBaseline(sessions);

  // Session that's FASTER and MORE fluent than usual
  const fasterSession = {
    typingSpeed: 60, // Faster (down_concerning direction, but z is negative = favorable)
    meanPauseMs: 300, // Fewer pauses (up_concerning direction, but z is negative = favorable)
    pauseStdDevMs: 100,
    correctionRate: 0.02, // Fewer corrections (up_concerning direction, but z is negative = favorable)
    timingVariance: 0.08,
    longPauseRate: 0.05, // Fewer long pauses
    correctionBurstRate: 0.01, // Fewer bursts
    speedDecay: 0.02, // Less slowdown
  };

  const result = scoreSession(fasterSession, baseline);

  // Faster session should NOT have high deviation
  // (concerning z-scores are clamped at 0 when direction is favorable)
  assert.ok(result.deviation < 0.5,
    "Faster, more fluent session should not be flagged as concerning");
});

test("directional scoring: slower session flags as concerning", () => {
  // Use sessions with realistic variation so MAD > 0
  const sessions = Array.from({ length: 15 }, (_, i) => ({
    typingSpeed: 55 + (i % 3) * 5, // Varies 55-65
    meanPauseMs: 280 + (i % 3) * 20, // Varies 280-320
    pauseStdDevMs: 90 + (i % 3) * 10, // Varies 90-110
    correctionRate: 0.02 + (i % 3) * 0.005, // Varies 0.02-0.03
    timingVariance: 0.07 + (i % 3) * 0.01, // Varies 0.07-0.09
    longPauseRate: 0.04 + (i % 3) * 0.01, // Varies 0.04-0.06
    correctionBurstRate: 0.01 + (i % 3) * 0.002, // Varies 0.01-0.014
    speedDecay: 0.02 + (i % 3) * 0.005, // Varies 0.02-0.03
  }));
  const baseline = buildBaseline(sessions);

  // Session that's SLOWER and LESS fluent than usual
  const slowerSession = {
    typingSpeed: 30, // Much slower
    meanPauseMs: 800, // Many more pauses
    pauseStdDevMs: 300,
    correctionRate: 0.15, // Many more corrections
    timingVariance: 0.4,
    longPauseRate: 0.4, // Many more long pauses
    correctionBurstRate: 0.1, // Many more bursts
    speedDecay: 0.3, // More slowdown
  };

  const result = scoreSession(slowerSession, baseline);

  // Slower session should have higher deviation than a similar session
  const similarSession = {
    typingSpeed: 60,
    meanPauseMs: 300,
    pauseStdDevMs: 100,
    correctionRate: 0.02,
    timingVariance: 0.08,
    longPauseRate: 0.05,
    correctionBurstRate: 0.01,
    speedDecay: 0.02,
  };
  const similarResult = scoreSession(similarSession, baseline);

  assert.ok(result.deviation > similarResult.deviation,
    `Slower session (${result.deviation}) should have higher deviation than similar session (${similarResult.deviation})`);
});

// ═══════════════════════════════════════════════════════════════════
// Multi-Session Smoothing Tests
// ═══════════════════════════════════════════════════════════════════

test("rollingAverage computes average of last N sessions", () => {
  const sessions = [
    { typingSpeed: 40, meanPauseMs: 400, pauseStdDevMs: 150, correctionRate: 0.05, timingVariance: 0.1, longPauseRate: 0.1, correctionBurstRate: 0.02, speedDecay: 0.05 },
    { typingSpeed: 50, meanPauseMs: 500, pauseStdDevMs: 200, correctionRate: 0.08, timingVariance: 0.15, longPauseRate: 0.15, correctionBurstRate: 0.03, speedDecay: 0.08 },
    { typingSpeed: 60, meanPauseMs: 600, pauseStdDevMs: 250, correctionRate: 0.1, timingVariance: 0.2, longPauseRate: 0.2, correctionBurstRate: 0.04, speedDecay: 0.1 },
  ];

  const avg = rollingAverage(sessions, 3);
  assert.ok(avg);
  assert.equal(avg.sessionCount, 3);
  assert.ok(Math.abs(avg.typingSpeed - 50) < 0.01, "Average of 40,50,60 = 50");
  assert.ok(Math.abs(avg.meanPauseMs - 500) < 0.01, "Average of 400,500,600 = 500");
});

test("scoreSmoothed uses multi-session average", () => {
  const sessions = Array.from({ length: 15 }, () => ({
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  }));
  const baseline = buildBaseline(sessions);

  // Add 3 sessions: 2 normal, 1 very slow
  const recentSessions = [
    ...sessions,
    { typingSpeed: 40, meanPauseMs: 400, pauseStdDevMs: 150, correctionRate: 0.05, timingVariance: 0.1, longPauseRate: 0.1, correctionBurstRate: 0.02, speedDecay: 0.05 },
    { typingSpeed: 40, meanPauseMs: 400, pauseStdDevMs: 150, correctionRate: 0.05, timingVariance: 0.1, longPauseRate: 0.1, correctionBurstRate: 0.02, speedDecay: 0.05 },
    { typingSpeed: 20, meanPauseMs: 800, pauseStdDevMs: 300, correctionRate: 0.15, timingVariance: 0.4, longPauseRate: 0.4, correctionBurstRate: 0.1, speedDecay: 0.3 },
  ];

  const smoothedResult = scoreSmoothed(recentSessions, baseline);
  assert.ok(smoothedResult.ready);
  assert.ok(smoothedResult.deviation >= 0);

  // The smoothed deviation should be less extreme than the single-session deviation
  const singleSessionResult = scoreSession(recentSessions.at(-1), baseline);
  assert.ok(smoothedResult.deviation <= singleSessionResult.deviation,
    "Smoothed deviation should be less extreme than single-session");
});

// ═══════════════════════════════════════════════════════════════════
// Direction Summary Tests
// ═══════════════════════════════════════════════════════════════════

test("summarizeDirection identifies favorable changes", () => {
  const zScores = {
    typingSpeed: 1.5, // Faster (down_concerning, but positive z = favorable)
    meanPauseMs: -1.2, // Fewer pauses (up_concerning, but negative z = favorable)
    pauseStdDevMs: 0.3, // Neutral, small
    correctionRate: -0.8, // Fewer corrections (favorable)
    timingVariance: 0.2, // Neutral, small
    longPauseRate: -1.0, // Fewer long pauses (favorable)
    correctionBurstRate: -0.7, // Fewer bursts (favorable)
    speedDecay: -0.5, // Less slowdown (favorable)
  };

  const summary = summarizeDirection(zScores);
  assert.equal(summary.overall, "favorable");
  assert.ok(summary.favorable.length > 0);
  assert.ok(summary.concerning.length === 0);
});

test("summarizeDirection identifies concerning changes", () => {
  const zScores = {
    typingSpeed: -1.5, // Slower (down_concerning, negative z = concerning)
    meanPauseMs: 1.2, // More pauses (up_concerning, positive z = concerning)
    pauseStdDevMs: 0.3, // Neutral, small
    correctionRate: 0.8, // More corrections (concerning)
    timingVariance: 0.2, // Neutral, small
    longPauseRate: 1.0, // More long pauses (concerning)
    correctionBurstRate: 0.7, // More bursts (concerning)
    speedDecay: 0.5, // More slowdown (concerning)
  };

  const summary = summarizeDirection(zScores);
  assert.equal(summary.overall, "concerning");
  assert.ok(summary.concerning.length > 0);
});

test("summarizeDirection identifies mixed changes", () => {
  const zScores = {
    typingSpeed: -1.5, // Slower (concerning)
    meanPauseMs: 1.2, // More pauses (concerning)
    pauseStdDevMs: 0.3, // Neutral, small
    correctionRate: -0.8, // Fewer corrections (favorable)
    timingVariance: 0.2, // Neutral, small
    longPauseRate: 1.0, // More long pauses (concerning)
    correctionBurstRate: -0.7, // Fewer bursts (favorable)
    speedDecay: -0.5, // Less slowdown (favorable)
  };

  const summary = summarizeDirection(zScores);
  // Should have both concerning and favorable signals
  assert.ok(summary.concerning.length > 0, "Should have concerning signals");
  assert.ok(summary.favorable.length > 0, "Should have favorable signals");
});

// ═══════════════════════════════════════════════════════════════════
// Validation Tests
// ═══════════════════════════════════════════════════════════════════

test("sanitizeSession accepts new feature fields", () => {
  const payload = {
    typingSpeed: 45,
    meanPauseMs: 300,
    pauseStdDevMs: 100,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.2,
    correctionBurstRate: 0.03,
    speedDecay: 0.1,
    sessionDuration: 120,
    sessionDurationMinutes: 2,
  };

  const session = sanitizeSession(payload);
  assert.equal(session.typingSpeed, 45);
  assert.equal(session.longPauseRate, 0.2);
  assert.equal(session.correctionBurstRate, 0.03);
  assert.equal(session.speedDecay, 0.1);
  assert.equal(session.sessionDurationMinutes, 2);
});

test("sanitizeSession defaults new features to 0 if missing", () => {
  const payload = {
    typingSpeed: 45,
    meanPauseMs: 300,
    pauseStdDevMs: 100,
    correctionRate: 0.05,
    timingVariance: 0.1,
    sessionDuration: 120,
    // New features intentionally omitted
  };

  const session = sanitizeSession(payload);
  assert.equal(session.longPauseRate, 0);
  assert.equal(session.correctionBurstRate, 0);
  assert.equal(session.speedDecay, 0);
  assert.equal(session.sessionDurationMinutes, 0);
});

test("sanitizeSession rejects forbidden text fields", () => {
  assert.throws(
    () => sanitizeSession({ typingSpeed: 45, text: "hello" }),
    /not accepted/
  );
});

// ═══════════════════════════════════════════════════════════════════
// Insights Tests
// ═══════════════════════════════════════════════════════════════════

test("fallbackInsight returns favorable copy for favorable direction", () => {
  const insight = fallbackInsight({
    score: {
      ready: true,
      deviation: 1.5,
      dominantFeature: "typingSpeed",
      zScores: { typingSpeed: 1.5 },
    },
    direction: { overall: "favorable", favorable: ["typingSpeed"], concerning: [] },
    supportLevel: "suggestions",
  });

  assert.match(insight.observation, /smoother|consistent|usual/i);
  assert.doesNotMatch(insight.observation, /depress|anxi|diagnos/i);
});

test("fallbackInsight returns calm copy for low deviation", () => {
  const insight = fallbackInsight({
    score: { ready: true, deviation: 0.5, dominantFeature: "typingSpeed" },
    direction: { overall: "neutral" },
    supportLevel: "suggestions",
  });

  assert.match(insight.observation, /close|usual|pattern/i);
});

test("insightPrompt includes directional info", () => {
  const prompt = insightPrompt({
    score: { deviation: 1.5, dominantFeature: "typingSpeed" },
    direction: { overall: "favorable", favorable: ["typingSpeed"] },
    smoothed: { deviation: 1.2 },
    baseline: { ready: true, sessionCount: 15 },
  });

  assert.ok(prompt.includes("direction"));
  assert.ok(prompt.includes("favorable"));
  assert.ok(prompt.includes("NEVER diagnose"));
});

// ═══════════════════════════════════════════════════════════════════
// Backward Compatibility Tests
// ═══════════════════════════════════════════════════════════════════

test("FEATURE_KEYS includes all 9 features", () => {
  assert.equal(FEATURE_KEYS.length, 9);
  assert.ok(FEATURE_KEYS.includes("typingSpeed"));
  assert.ok(FEATURE_KEYS.includes("longPauseRate"));
  assert.ok(FEATURE_KEYS.includes("correctionBurstRate"));
  assert.ok(FEATURE_KEYS.includes("speedDecay"));
  assert.ok(FEATURE_KEYS.includes("sessionDurationMinutes"));
});

test("ORIGINAL_FEATURE_KEYS has the original 5", () => {
  assert.equal(ORIGINAL_FEATURE_KEYS.length, 5);
  assert.ok(ORIGINAL_FEATURE_KEYS.includes("typingSpeed"));
  assert.ok(!ORIGINAL_FEATURE_KEYS.includes("longPauseRate"));
});

test("FEATURE_DIRECTION covers all features", () => {
  for (const key of FEATURE_KEYS) {
    assert.ok(key in FEATURE_DIRECTION, `Missing direction for ${key}`);
    assert.ok(
      ["up_concerning", "down_concerning", "neutral"].includes(FEATURE_DIRECTION[key]),
      `Invalid direction for ${key}: ${FEATURE_DIRECTION[key]}`
    );
  }
});

test("FEATURE_BOUNDS covers all features", () => {
  for (const key of FEATURE_KEYS) {
    assert.ok(key in FEATURE_BOUNDS, `Missing bounds for ${key}`);
    assert.ok(FEATURE_BOUNDS[key].length === 2);
    assert.ok(FEATURE_BOUNDS[key][0] < FEATURE_BOUNDS[key][1]);
  }
});

test("baseline object shape is backward-compatible", () => {
  const sessions = Array.from({ length: 10 }, () => ({
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  }));

  const baseline = buildBaseline(sessions);

  // Old fields still present
  assert.ok("ready" in baseline);
  assert.ok("sessionCount" in baseline);
  assert.ok("minRequired" in baseline);
  assert.ok("features" in baseline);

  // Each feature has median/mad instead of mean/stdDev
  // (new API, but same structure)
  assert.ok("median" in baseline.features.typingSpeed);
  assert.ok("mad" in baseline.features.typingSpeed);
});

test("scoreSession result shape is backward-compatible", () => {
  const sessions = Array.from({ length: 10 }, () => ({
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
    longPauseRate: 0.1,
    correctionBurstRate: 0.02,
    speedDecay: 0.05,
  }));
  const baseline = buildBaseline(sessions);

  const result = scoreSession(sessions[0], baseline);

  // Old fields still present
  assert.ok("ready" in result);
  assert.ok("deviation" in result);
  assert.ok("zScores" in result);
  assert.ok("dominantFeature" in result);
  assert.ok("highDeviation" in result);

  // New fields added
  assert.ok("_rawCombinedZ" in result);
  assert.ok("_confidence" in result);
});
