/**
 * BHAAV — Baseline Computation
 *
 * Computes the user's personal baseline from historical sessions,
 * then scores new sessions against that baseline.
 *
 * Key changes from v1 (stats.js):
 *   - Uses median/MAD instead of mean/stdDev (robust to outliers)
 *   - Recency weighting: last 5 sessions count ~2x
 *   - Directional scoring: only concerning-direction z-scores count
 *   - Confidence dampening: low session counts produce weaker scores
 *   - Multi-session smoothing: rolling average of last 3 sessions
 *
 * All outputs remain backward-compatible with the frontend's existing
 * consumption patterns (deviation, zScores, dominantFeature, highDeviation).
 */

import { FEATURE_KEYS, FEATURE_DIRECTION } from "./featureExtraction.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Minimum sessions before a baseline is considered "ready."
 * Before this point, we can't compute reliable statistics.
 */
export const MIN_BASELINE_SESSIONS = Number(process.env.MIN_BASELINE_SESSIONS || 5);

/**
 * Small epsilon to avoid division by zero when MAD is 0.
 */
const MAD_EPSILON = 1e-6;

/**
 * Threshold for "high deviation" flag (in combined z-score units).
 * 1.65σ ≈ 90th percentile of a normal distribution.
 */
export const HIGH_DEVIATION = 1.65;

/**
 * Number of recent sessions that get ~2x weight in baseline computation.
 */
const RECENCY_WINDOW = 5;

/**
 * Recency weight multiplier for sessions in the recency window.
 * Sessions in [n-RECENCY_WINDOW, n] get this weight; others get 1.0.
 */
const RECENCY_WEIGHT = 2.0;

/**
 * Number of recent sessions to average for multi-session smoothing.
 */
const SMOOTHING_WINDOW = 3;

// ── Statistical Helpers ──────────────────────────────────────────────────────

/**
 * Compute the median of an array of numbers.
 */
export function median(values) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const mid = Math.floor(xs.length / 2);
  if (xs.length % 2 === 0) {
    return (xs[mid - 1] + xs[mid]) / 2;
  }
  return xs[mid];
}

/**
 * Compute the Median Absolute Deviation (MAD).
 * MAD = median(|x_i - median(x)|)
 * Robust alternative to standard deviation — not thrown off by outliers.
 */
export function mad(values) {
  const med = median(values);
  const absDevs = values
    .filter((v) => Number.isFinite(v))
    .map((v) => Math.abs(v - med));
  return median(absDevs);
}

/**
 * Compute weighted median and MAD.
 *
 * @param {number[]} values - feature values across sessions
 * @param {number[]} weights - corresponding weights (e.g. recency weighting)
 * @returns {{ median: number, mad: number }}
 */
export function weightedMedianMad(values, weights) {
  // Pair values with weights, filter out non-finite
  const pairs = [];
  for (let i = 0; i < values.length; i++) {
    if (Number.isFinite(values[i]) && Number.isFinite(weights[i]) && weights[i] > 0) {
      pairs.push({ value: values[i], weight: weights[i] });
    }
  }
  if (pairs.length === 0) return { median: 0, mad: 0 };

  // Sort by value
  pairs.sort((a, b) => a.value - b.value);

  // Compute weighted median
  const totalWeight = pairs.reduce((s, p) => s + p.weight, 0);
  let cumulative = 0;
  let med = pairs[0].value;
  for (const p of pairs) {
    cumulative += p.weight;
    if (cumulative >= totalWeight / 2) {
      med = p.value;
      break;
    }
  }

  // Compute weighted MAD
  const absDevs = pairs.map((p) => ({
    dev: Math.abs(p.value - med),
    weight: p.weight,
  }));
  absDevs.sort((a, b) => a.dev - b.dev);
  cumulative = 0;
  let m = 0;
  for (const p of absDevs) {
    cumulative += p.weight;
    if (cumulative >= totalWeight / 2) {
      m = p.dev;
      break;
    }
  }

  return { median: med, mad: m };
}

/**
 * Compute z-score using median/MAD instead of mean/stdDev.
 *
 * For MAD-based z-scores, we use the standard conversion:
 *   z = 0.6745 * (x - median) / MAD
 *
 * The 0.6745 factor makes MAD-consistent z-scores comparable to
 * standard z-scores (since MAD ≈ 0.6745 * σ for normal distributions).
 *
 * @param {number} value - the observation
 * @param {number} med - baseline median
 * @param {number} m - baseline MAD
 * @returns {number} z-score
 */
export function madZScore(value, med, m) {
  if (!Number.isFinite(value) || !Number.isFinite(med)) return 0;
  if (!Number.isFinite(m) || Math.abs(m) < MAD_EPSILON) return 0;
  return 0.6745 * (value - med) / m;
}

// ── Baseline Builder ─────────────────────────────────────────────────────────

/**
 * Compute the user's personal baseline from historical sessions.
 *
 * Uses median/MAD (robust to outliers) with recency weighting
 * (last 5 sessions count ~2x as older sessions).
 *
 * @param {Array} sessions - array of session objects with feature keys
 * @returns {object} baseline object
 */
export function buildBaseline(sessions) {
  const ready = sessions.length >= MIN_BASELINE_SESSIONS;
  const stats = {};

  // Compute recency weights
  const weights = sessions.map((_, i) => {
    const age = sessions.length - 1 - i; // 0 = most recent
    return age < RECENCY_WINDOW ? RECENCY_WEIGHT : 1.0;
  });

  for (const key of FEATURE_KEYS) {
    const values = sessions.map((s) => s[key]);

    // Use weighted median/MAD for robustness
    const { median: med, mad: m } = weightedMedianMad(values, weights);

    stats[key] = {
      median: round(med, 4),
      mad: round(m, 4),
      n: values.filter((v) => Number.isFinite(v)).length,
    };
  }

  return {
    ready,
    sessionCount: sessions.length,
    minRequired: MIN_BASELINE_SESSIONS,
    features: stats,
  };
}

// ── Deviation Scoring ────────────────────────────────────────────────────────

/**
 * Weight multipliers for specific features whose standalone signal is weaker.
 *
 * correctionRate (backspace_rate): Liu et al. (JMIR 2024, n=128) found that raw
 * backspace rate alone did NOT significantly differ between healthy and mood-disorder
 * groups — only a derived multi-feature pattern was predictive. We apply a 0.6x
 * weight to reflect this weaker standalone signal, while keeping the feature in the
 * set because it contributes to the multi-feature picture.
 *
 * All other features use weight 1.0 (no adjustment).
 */
const FEATURE_WEIGHTS = {
  correctionRate: 0.6,
};

/**
 * Score a single session against the baseline.
 *
 * Directional: only concerning-direction z-scores contribute to the combined score.
 * A session that's FASTER and MORE fluent than usual scores low/normal.
 *
 * Confidence-dampened: low session counts produce weaker scores.
 *
 * @param {object} session - session features
 * @param {object} baseline - baseline object from buildBaseline()
 * @returns {object} scoring result
 */
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
  const concerningZScores = [];
  const neutralZScores = [];

  for (const key of FEATURE_KEYS) {
    const z = madZScore(session[key], baseline.features[key].median, baseline.features[key].mad);
    zScores[key] = round(z, 3);

    // Apply feature-specific weight multiplier (e.g. correctionRate at 0.6x)
    const weight = FEATURE_WEIGHTS[key] ?? 1.0;

    const direction = FEATURE_DIRECTION[key];
    if (direction === "neutral") {
      // Neutral features: magnitude matters, not direction
      neutralZScores.push(Math.abs(z) * weight);
    } else if (direction === "up_concerning") {
      // Higher is concerning: only count positive z-scores
      concerningZScores.push(Math.max(0, z) * weight);
    } else if (direction === "down_concerning") {
      // Lower is concerning: only count negative z-scores (as positive magnitude)
      concerningZScores.push(Math.max(0, -z) * weight);
    }
  }

  // Combined z: RMS of concerning-direction z-scores + neutral z-scores
  const allRelevant = [...concerningZScores, ...neutralZScores];
  const combinedZ = allRelevant.length > 0
    ? Math.sqrt(allRelevant.reduce((s, z) => s + z * z, 0) / allRelevant.length)
    : 0;

  // Confidence dampening: scale by how established the baseline is
  const confidence = Math.min(1, (baseline.sessionCount - MIN_BASELINE_SESSIONS) / 10);
  const dampenedDeviation = combinedZ * confidence;

  // Find dominant feature (largest concerning z-score)
  let dominantFeature = FEATURE_KEYS[0];
  let maxZ = 0;
  for (const key of FEATURE_KEYS) {
    const abs = Math.abs(zScores[key]);
    if (abs > maxZ) {
      maxZ = abs;
      dominantFeature = key;
    }
  }

  return {
    ready: true,
    deviation: round(clamp(dampenedDeviation, 0, 8), 2),
    zScores,
    dominantFeature,
    highDeviation: dampenedDeviation >= HIGH_DEVIATION,
    // Expose raw combinedZ and confidence for explainability
    _rawCombinedZ: round(combinedZ, 3),
    _confidence: round(confidence, 3),
  };
}

// ── Multi-Session Smoothing ──────────────────────────────────────────────────

/**
 * Compute the rolling average of the last N sessions for each feature.
 * Used for weekly insights and intervention triggers — smoother than
 * single-session scoring, less likely to fire on one noisy session.
 *
 * @param {Array} sessions - recent sessions (newest last)
 * @param {number} window - number of sessions to average (default: 3)
 * @returns {object} averaged features
 */
export function rollingAverage(sessions, window = SMOOTHING_WINDOW) {
  const recent = sessions.slice(-window);
  if (recent.length === 0) return null;

  const averaged = {};
  for (const key of FEATURE_KEYS) {
    const values = recent.map((s) => s[key]).filter((v) => Number.isFinite(v));
    averaged[key] = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }
  averaged.sessionCount = recent.length;
  averaged.windowSize = window;
  return averaged;
}

/**
 * Score a smoothed (multi-session) feature set against the baseline.
 * This is the version used for weekly insights and intervention triggers.
 *
 * @param {Array} sessions - recent sessions (newest last)
 * @param {object} baseline - baseline from buildBaseline()
 * @returns {object} scoring result (same shape as scoreSession)
 */
export function scoreSmoothed(sessions, baseline) {
  const smoothed = rollingAverage(sessions);
  if (!smoothed) {
    return {
      ready: false,
      deviation: null,
      zScores: {},
      dominantFeature: null,
      highDeviation: false,
    };
  }
  return scoreSession(smoothed, baseline);
}

// ── Direction Summary ────────────────────────────────────────────────────────

/**
 * Generate a human-readable summary of what direction the session moved in.
 * Used by the insight prompt so Claude never says "something looked different"
 * for a week that was actually faster and more fluent.
 *
 * @param {object} zScores - z-scores from scoreSession
 * @returns {object} direction summary
 */
export function summarizeDirection(zScores) {
  const concerning = [];
  const favorable = [];
  const neutral = [];

  for (const key of FEATURE_KEYS) {
    const z = zScores[key] || 0;
    const direction = FEATURE_DIRECTION[key];

    if (direction === "neutral") {
      if (Math.abs(z) > 0.5) neutral.push(key);
    } else if (direction === "up_concerning") {
      if (z > 0.5) concerning.push(key);
      else if (z < -0.5) favorable.push(key);
    } else if (direction === "down_concerning") {
      if (z < -0.5) concerning.push(key);
      else if (z > 0.5) favorable.push(key);
    }
  }

  return {
    concerning,
    favorable,
    neutral,
    overall:
      concerning.length > favorable.length
        ? "concerning"
        : favorable.length > concerning.length
          ? "favorable"
          : "mixed",
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function round(n, digits = 1) {
  if (!Number.isFinite(n)) return 0;
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
