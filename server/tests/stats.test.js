import test from "node:test";
import assert from "node:assert/strict";
import { buildBaseline, campusAggregate, scoreSession, zScore } from "../src/stats.js";
import { sanitizeSession, hasForbiddenTextFields } from "../src/validate.js";
import { fallbackInsight } from "../src/insights.js";

test("z-score is zero when variance is zero", () => {
  assert.equal(zScore(48, 48, 0), 0);
  assert.equal(zScore(100, 48, 0), 0);
});

test("baseline waits for enough sessions", () => {
  const sessions = Array.from({ length: 3 }, () => ({
    typingSpeed: 40,
    meanPauseMs: 400,
    pauseStdDevMs: 150,
    correctionRate: 0.05,
    timingVariance: 0.1,
  }));
  assert.equal(buildBaseline(sessions).ready, false);
});

test("deviation is RMS of z-scores and explainable", () => {
  const baselineSessions = Array.from({ length: 8 }, (_, i) => ({
    typingSpeed: 48 + (i % 2),
    meanPauseMs: 400 + i,
    pauseStdDevMs: 170,
    correctionRate: 0.05,
    timingVariance: 0.11,
  }));
  const baseline = buildBaseline(baselineSessions);
  assert.equal(baseline.ready, true);
  const scored = scoreSession(
    {
      typingSpeed: 30,
      meanPauseMs: 900,
      pauseStdDevMs: 400,
      correctionRate: 0.2,
      timingVariance: 0.4,
    },
    baseline,
  );
  assert.equal(scored.ready, true);
  assert.ok(scored.deviation > 1);
  assert.ok(scored.dominantFeature);
});

test("rejects journal text fields", () => {
  assert.equal(hasForbiddenTextFields({ typingSpeed: 1, text: "hello" }), true);
  assert.throws(() => sanitizeSession({ text: "secret journal" }), /not accepted/);
});

test("campus pulse refuses below threshold", () => {
  for (const n of [1, 5, 9]) {
    const rows = Array.from({ length: n }, (_, i) => ({
      userId: `u${i}`,
      createdAt: new Date().toISOString(),
      deviation: 1,
    }));
    const pulse = campusAggregate(rows, 10);
    assert.equal(pulse.withheld, true);
    assert.equal(pulse.available, false);
    assert.equal("participantCount" in pulse, false);
  }
});

test("campus pulse returns aggregate at 10 and 20", () => {
  for (const n of [10, 20]) {
    const rows = Array.from({ length: n }, (_, i) => ({
      userId: `u${i}`,
      createdAt: new Date().toISOString(),
      deviation: 1.2,
    }));
    const pulse = campusAggregate(rows, 10);
    assert.equal(pulse.withheld, false);
    assert.equal(pulse.participantCount, n);
    assert.ok(!JSON.stringify(pulse).includes("u0"));
  }
});

test("AI fallback never diagnoses", () => {
  const insight = fallbackInsight({
    score: { ready: true, deviation: 2.1, dominantFeature: "timingVariance" },
    supportLevel: "suggestions",
  });
  assert.match(insight.observation, /rhythm|baseline|variable/i);
  assert.doesNotMatch(insight.observation, /depress|anxi|diagnos/i);
});
