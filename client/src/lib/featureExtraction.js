/**
 * Pure keystroke feature extraction — no React, no DOM.
 *
 * Input: events = [{ t: number (ms, from performance.now()), isCorrection: boolean }]
 * The hook guarantees these are the ONLY two fields ever recorded —
 * no character data exists at this boundary by construction.
 *
 * Returns numeric features, or null when the session is too small to interpret.
 */

export const MIN_EVENTS = 5;
export const PAUSE_THRESHOLD_MS = 500;

export function extractFeatures(events, startTime, endTime) {
  if (!Array.isArray(events) || events.length < MIN_EVENTS) {
    return null;
  }

  const safeStart = Number.isFinite(startTime) ? startTime : events[0].t;
  const safeEnd = Number.isFinite(endTime) ? endTime : events[events.length - 1].t;
  const durationSeconds = Math.max(1, Math.round((safeEnd - safeStart) / 1000));

  // Inter-keystroke intervals (IKIs), pauses, corrections, bursts
  const ikis = [];
  const pauses = [];
  let correctionKeys = 0;
  let bursts = 0;
  let inBurst = false;

  for (let i = 1; i < events.length; i++) {
    const delta = events[i].t - events[i - 1].t;
    if (events[i].isCorrection) correctionKeys++;

    ikis.push(delta);
    if (delta > PAUSE_THRESHOLD_MS) {
      pauses.push(delta);
      inBurst = false;
    } else if (!inBurst) {
      bursts++;
      inBurst = true;
    }
  }
  if (events[0]?.isCorrection) correctionKeys++;

  // 1. Gross typing speed (WPM), clamped to a human range
  const minutes = durationSeconds / 60;
  const grossWords = events.length / 5;
  const typingSpeed = Number(
    Math.min(180, Math.max(5, grossWords / Math.max(minutes, 1 / 3600))).toFixed(1)
  );

  // 2. Mean pause + std dev (pauses only; sensible defaults when absent)
  const meanPauseMs = pauses.length > 0
    ? Number((pauses.reduce((a, b) => a + b, 0) / pauses.length).toFixed(1))
    : 600;

  let pauseStdDevMs = 150;
  if (pauses.length > 1) {
    const variance = pauses.reduce(
      (acc, p) => acc + Math.pow(p - meanPauseMs, 2), 0
    ) / (pauses.length - 1);
    pauseStdDevMs = Number(Math.sqrt(variance).toFixed(1));
  }

  // 3. Correction rate
  const correctionRate = Number((correctionKeys / events.length).toFixed(4));

  // 4. Timing variability (coefficient of variation of all IKIs)
  const meanIki = ikis.reduce((a, b) => a + b, 0) / ikis.length;
  const varianceIki = ikis.reduce(
    (acc, v) => acc + Math.pow(v - meanIki, 2), 0
  ) / ikis.length;
  const timingVariance = Number(
    (meanIki > 0 ? Math.sqrt(varianceIki) / meanIki : 0.15).toFixed(4)
  );

  return {
    typingSpeed,
    meanPauseMs,
    pauseStdDevMs,
    correctionRate,
    timingVariance,
    burstCount: bursts,
    sessionDuration: durationSeconds,
  };
}
