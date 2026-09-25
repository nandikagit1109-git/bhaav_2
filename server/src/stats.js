export const FEATURE_KEYS = [
  "typingSpeed",
  "meanPauseMs",
  "pauseStdDevMs",
  "correctionRate",
  "timingVariance",
];

export const MIN_BASELINE_SESSIONS = Number(process.env.MIN_BASELINE_SESSIONS || 5);
export const ZERO_VARIANCE_EPS = 1e-6;
export const HIGH_DEVIATION = 1.65;

export function mean(values) {
  const xs = values.filter((v) => Number.isFinite(v));
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function sampleStdDev(values) {
  const xs = values.filter((v) => Number.isFinite(v));
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const sumSq = xs.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return Math.sqrt(sumSq / (xs.length - 1));
}

export function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function zScore(value, baselineMean, baselineSd) {
  if (!Number.isFinite(value) || !Number.isFinite(baselineMean)) return 0;
  if (!Number.isFinite(baselineSd) || Math.abs(baselineSd) < ZERO_VARIANCE_EPS) {
    return 0;
  }
  return (value - baselineMean) / baselineSd;
}

export function buildBaseline(sessions) {
  const ready = sessions.length >= MIN_BASELINE_SESSIONS;
  const stats = {};
  for (const key of FEATURE_KEYS) {
    const values = sessions.map((s) => s[key]);
    stats[key] = {
      mean: round(mean(values), 4),
      stdDev: round(sampleStdDev(values), 4),
      n: values.filter((v) => Number.isFinite(v)).length,
    };
  }
  return { ready, sessionCount: sessions.length, minRequired: MIN_BASELINE_SESSIONS, features: stats };
}

export function scoreSession(session, baseline) {
  if (!baseline?.ready) {
    return {
      ready: false,
      deviation: null,
      zScores: {},
      dominantFeature: null,
      highDeviation: false,
    };
  }

  const zScores = {};
  const squares = [];
  for (const key of FEATURE_KEYS) {
    const z = zScore(session[key], baseline.features[key].mean, baseline.features[key].stdDev);
    zScores[key] = round(z, 3);
    squares.push(z * z);
  }

  const deviation = round(Math.sqrt(mean(squares)), 2);
  let dominantFeature = FEATURE_KEYS[0];
  let maxAbs = 0;
  for (const key of FEATURE_KEYS) {
    const abs = Math.abs(zScores[key]);
    if (abs > maxAbs) {
      maxAbs = abs;
      dominantFeature = key;
    }
  }

  return {
    ready: true,
    deviation: clamp(deviation, 0, 8),
    zScores,
    dominantFeature,
    highDeviation: deviation >= HIGH_DEVIATION,
  };
}

export function round(n, digits = 1) {
  if (!Number.isFinite(n)) return 0;
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

export function campusAggregate(sessions, minGroupSize) {
  const users = new Set(sessions.map((s) => s.userId));
  if (users.size < minGroupSize) {
    return {
      withheld: true,
      available: false,
      minGroupSize,
      message: "Not enough participants to show this trend privately.",
    };
  }

  const byWeek = new Map();
  for (const session of sessions) {
    const week = weekStart(session.createdAt);
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(session.deviation ?? 0);
  }

  const weeks = [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, values]) => ({
      week,
      meanDeviation: round(mean(values), 2),
      sessions: values.length,
    }));

  const recent = weeks.slice(-4);
  const current = recent.at(-1)?.meanDeviation ?? 0;
  const prior = mean(recent.slice(0, -1).map((w) => w.meanDeviation)) || current;
  const delta = round(current - prior, 2);
  let direction = "steady";
  if (delta > 0.15) direction = "higher";
  else if (delta < -0.15) direction = "lower";

  return {
    withheld: false,
    available: true,
    minGroupSize,
    participantCount: users.size,
    currentDeviation: current,
    direction,
    delta,
    weeks,
    message:
      direction === "higher"
        ? "Aggregate writing patterns show a higher level of deviation this week than the recent campus baseline."
        : direction === "lower"
          ? "Aggregate writing patterns are closer to the recent campus baseline this week."
          : "Campus writing rhythm is close to its recent baseline.",
  };
}

export function weekStart(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}
