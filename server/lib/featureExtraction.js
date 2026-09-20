/**
 * BHAAV — Feature Extraction
 *
 * Extracts 8 behavioral features from raw typing telemetry:
 *
 * ORIGINAL 5 (backward-compatible):
 *   typingSpeed           — words per minute
 *   meanPauseMs           — average pause length (≥2000ms threshold)
 *   pauseStdDevMs         — variability of pause lengths
 *   correctionRate        — backspace events / total keystrokes
 *   timingVariance        — variability in inter-keystroke intervals
 *
 * NEW 3:
 *   longPauseRate         — pauses >5000ms / total pauses (distracted vs thinking)
 *   correctionBurstRate   — sequences of 3+ consecutive backspaces / total corrections
 *   speedDecay            — (first-half WPM - second-half WPM) / first-half WPM
 *
 * All features are designed to be explainable: each answers a clear behavioral
 * question that can be stated in plain language.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum pause duration (ms) to count as a "pause" in the original features */
const PAUSE_THRESHOLD_MS = 2000;

/** Minimum pause duration (ms) to count as a "long pause" (distracted/stopped) */
const LONG_PAUSE_THRESHOLD_MS = 5000;

/** Number of consecutive backspaces that constitute a "burst" (bigger revision) */
const BURST_LENGTH = 3;

// ── Raw Event Processing ──────────────────────────────────────────────────────

/**
 * Process raw keystroke events into session-level features.
 *
 * Expected input shape (from the browser telemetry client):
 * {
 *   events: [
 *     { type: "keydown"|"keyup", key: "...", timestamp: ms },
 *     ...
 *   ]
 * }
 *
 * We extract ONLY behavioral metadata — never the actual characters typed.
 *
 * @param {object} raw - raw telemetry payload
 * @returns {object} extracted features (8 behavioral metrics)
 */
export function extractFeatures(raw) {
  const events = raw?.events;
  if (!Array.isArray(events) || events.length < 2) {
    return fallbackFeatures(raw);
  }

  // Sort by timestamp
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  // ── Build derived arrays ──────────────────────────────────────────────────

  // Key-down events only (for WPM, pause analysis)
  const keyDowns = sorted.filter((e) => e.type === "keydown" && !isModifier(e.key));
  if (keyDowns.length < 2) return fallbackFeatures(raw);

  // Inter-keystroke intervals (ms)
  const intervals = [];
  for (let i = 1; i < keyDowns.length; i++) {
    intervals.push(keyDowns[i].timestamp - keyDowns[i - 1].timestamp);
  }

  // Session duration (ms) — from first to last keydown
  const sessionDurationMs = keyDowns.at(-1).timestamp - keyDowns[0].timestamp;
  const sessionDurationSec = sessionDurationMs / 1000;

  // Total keystrokes (for correction rate denominator)
  const totalKeystrokes = keyDowns.length;

  // ── Feature 1: Typing Speed (WPM) ────────────────────────────────────────
  // Standard WPM: (characters typed / 5) / minutes
  // We approximate characters from keydowns (excluding modifiers and backspace)
  const charEvents = keyDowns.filter((e) => !isBackspace(e.key) && !isModifier(e.key));
  const charsTyped = charEvents.length;
  const minutes = sessionDurationSec / 60;
  const typingSpeed = minutes > 0 ? (charsTyped / 5) / minutes : 0;

  // ── Feature 2: Mean Pause Duration ────────────────────────────────────────
  // Pauses are gaps ≥ PAUSE_THRESHOLD_MS between consecutive key-downs
  const pauses = intervals.filter((gap) => gap >= PAUSE_THRESHOLD_MS);
  const meanPauseMs = pauses.length > 0 ? mean(pauses) : 0;

  // ── Feature 3: Pause Standard Deviation ───────────────────────────────────
  // How variable the pauses are — high stdDev = inconsistent rhythm
  const pauseStdDevMs = pauses.length >= 2 ? sampleStdDev(pauses) : 0;

  // ── Feature 4: Correction Rate ────────────────────────────────────────────
  // Backspace events / total keystrokes
  const backspaceCount = keyDowns.filter((e) => isBackspace(e.key)).length;
  const correctionRate = totalKeystrokes > 0 ? backspaceCount / totalKeystrokes : 0;

  // ── Feature 5: Timing Variance ────────────────────────────────────────────
  // Coefficient of variation of inter-keystroke intervals (dimensionless)
  // CV = stdDev / mean — captures rhythm consistency independent of speed
  const meanInterval = mean(intervals);
  const sdInterval = sampleStdDev(intervals);
  const timingVariance = meanInterval > 0 ? sdInterval / meanInterval : 0;

  // ── Feature 6: Long Pause Rate ────────────────────────────────────────────
  // Pauses >5000ms / total pauses — captures "stopped/distracted" separately
  // from "briefly thinking" (which the original meanPauseMs captures)
  const longPauses = pauses.filter((gap) => gap >= LONG_PAUSE_THRESHOLD_MS);
  const longPauseRate = pauses.length > 0 ? longPauses.length / pauses.length : 0;

  // ── Feature 7: Correction Burst Rate ──────────────────────────────────────
  // Sequences of ≥3 consecutive backspaces count as ONE burst.
  // High burst rate = bigger revisions (meaningfully different from scattered typos)
  const bursts = countBursts(keyDowns);
  // Normalize: bursts per total correction events (avoid divide-by-zero)
  const correctionBurstRate = backspaceCount > 0 ? bursts / backspaceCount : 0;

  // ── Feature 8: Speed Decay ────────────────────────────────────────────────
  // Compare average WPM in first half vs second half of session.
  // Positive = slowing down (fatigue/energy flagging), negative = speeding up.
  // Expressed as a ratio: (firstHalfWPM - secondHalfWPM) / firstHalfWPM
  const speedDecay = computeSpeedDecay(keyDowns);

  return {
    typingSpeed: clamp(typingSpeed, 0, 250),
    meanPauseMs: clamp(meanPauseMs, 0, 20000),
    pauseStdDevMs: clamp(pauseStdDevMs, 0, 20000),
    correctionRate: clamp(correctionRate, 0, 1),
    timingVariance: clamp(timingVariance, 0, 5),
    longPauseRate: clamp(longPauseRate, 0, 1),
    correctionBurstRate: clamp(correctionBurstRate, 0, 1),
    speedDecay: clamp(speedDecay, -5, 5), // can be negative (speeding up)
    sessionDuration: clamp(sessionDurationSec, 0, 86400),
  };
}

// ── Speed Decay Computation ─────────────────────────────────────────────────

/**
 * Compute speed decay: how much slower the user typed in the second half
 * compared to the first half.
 *
 * @param {Array} keyDowns - sorted keydown events
 * @returns {number} (firstHalfWPM - secondHalfWPM) / firstHalfWPM
 *   Positive = slowing down, negative = speeding up, ~0 = steady
 */
function computeSpeedDecay(keyDowns) {
  if (keyDowns.length < 4) return 0; // Not enough data for halves

  const midIdx = Math.floor(keyDowns.length / 2);
  const firstHalf = keyDowns.slice(0, midIdx);
  const secondHalf = keyDowns.slice(midIdx);

  const wpm1 = computeWPM(firstHalf);
  const wpm2 = computeWPM(secondHalf);

  if (wpm1 <= 0) return 0; // Avoid division by zero
  return (wpm1 - wpm2) / wpm1;
}

/**
 * Compute WPM from a subset of keydown events.
 */
function computeWPM(keyDowns) {
  if (keyDowns.length < 2) return 0;
  const chars = keyDowns.filter((e) => !isBackspace(e.key) && !isModifier(e.key)).length;
  const durationSec = (keyDowns.at(-1).timestamp - keyDowns[0].timestamp) / 1000;
  const minutes = durationSec / 60;
  return minutes > 0 ? (chars / 5) / minutes : 0;
}

// ── Burst Detection ─────────────────────────────────────────────────────────

/**
 * Count sequences of ≥ BURST_LENGTH consecutive backspace events.
 * Each such sequence counts as ONE burst (a bigger revision).
 *
 * @param {Array} keyDowns - sorted keydown events
 * @returns {number} number of burst sequences
 */
function countBursts(keyDowns) {
  let bursts = 0;
  let consecutiveBackspaces = 0;

  for (const event of keyDowns) {
    if (isBackspace(event.key)) {
      consecutiveBackspaces++;
    } else {
      if (consecutiveBackspaces >= BURST_LENGTH) {
        bursts++;
      }
      consecutiveBackspaces = 0;
    }
  }
  // Check final streak
  if (consecutiveBackspaces >= BURST_LENGTH) {
    bursts++;
  }
  return bursts;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isBackspace(key) {
  return key === "Backspace" || key === "Delete";
}

function isModifier(key) {
  return ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape"].includes(key);
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sampleStdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Fallback features when raw events are insufficient.
 * Uses pre-computed values from the client if available,
 * otherwise returns safe defaults.
 */
function fallbackFeatures(raw) {
  return {
    typingSpeed: Number(raw?.typingSpeed) || 0,
    meanPauseMs: Number(raw?.meanPauseMs) || 0,
    pauseStdDevMs: Number(raw?.pauseStdDevMs) || 0,
    correctionRate: Number(raw?.correctionRate) || 0,
    timingVariance: Number(raw?.timingVariance) || 0,
    longPauseRate: Number(raw?.longPauseRate) || 0,
    correctionBurstRate: Number(raw?.correctionBurstRate) || 0,
    speedDecay: Number(raw?.speedDecay) || 0,
    sessionDuration: Number(raw?.sessionDuration) || 0,
  };
}

// ── Exports ──────────────────────────────────────────────────────────────────

/**
 * All 8 feature keys (backward-compatible: first 5 are the original set).
 */
export const FEATURE_KEYS = [
  "typingSpeed",
  "meanPauseMs",
  "pauseStdDevMs",
  "correctionRate",
  "timingVariance",
  "longPauseRate",
  "correctionBurstRate",
  "speedDecay",
];

/**
 * Original 5 features (for backward compatibility with existing code).
 */
export const ORIGINAL_FEATURE_KEYS = [
  "typingSpeed",
  "meanPauseMs",
  "pauseStdDevMs",
  "correctionRate",
  "timingVariance",
];

/**
 * Direction of each feature: "up_concerning", "down_concerning", or "neutral".
 *
 * "up_concerning" = higher values are worse (more pauses, more corrections)
 * "down_concerning" = lower values are worse (slower typing)
 * "neutral" = magnitude of change matters, not direction
 */
export const FEATURE_DIRECTION = {
  typingSpeed: "down_concerning",      // Slower = concerning
  meanPauseMs: "up_concerning",        // More pausing = concerning
  pauseStdDevMs: "neutral",            // More variable = different, not worse
  correctionRate: "up_concerning",     // More corrections = concerning
  timingVariance: "neutral",           // More variable = different, not worse
  longPauseRate: "up_concerning",      // More long pauses = concerning (distracted)
  correctionBurstRate: "up_concerning", // More bursts = concerning (bigger revisions)
  speedDecay: "up_concerning",         // Slowing down within session = concerning
};

/**
 * Feature bounds for validation/sanitization.
 * Extended to include the 3 new features.
 */
export const FEATURE_BOUNDS = {
  typingSpeed: [0, 250],
  meanPauseMs: [0, 20000],
  pauseStdDevMs: [0, 20000],
  correctionRate: [0, 1],
  timingVariance: [0, 5],
  sessionDuration: [0, 86400],
  longPauseRate: [0, 1],
  correctionBurstRate: [0, 1],
  speedDecay: [-5, 5],
};
