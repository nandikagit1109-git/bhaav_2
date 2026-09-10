import { describe, it, expect } from 'vitest';
import { extractFeatures, PAUSE_THRESHOLD_MS } from '../lib/featureExtraction';

/* ————————————————— Result language ————————————————— */
/* Mirrors JournalPage's thresholds — the contract the demo narrates. */
function resultHeadline(score) {
  if (score < 35) return { line1: 'Close to', line2: 'your usual.' };
  if (score < 35 + 25) return { line1: 'A little', line2: 'different.' };
  return { line1: 'Quite', line2: 'different.' };
}

describe('session result language', () => {
  it('uses non-clinical language across all bands', () => {
    expect(resultHeadline(10).line2).toBe('your usual.');
    expect(resultHeadline(35).line2).toBe('different.');
    expect(resultHeadline(59).line2).toBe('different.');
    expect(resultHeadline(90).line2).toBe('different.');
  });

  it('never contains diagnostic vocabulary', () => {
    for (const score of [0, 20, 40, 55, 70, 100]) {
      const h = resultHeadline(score);
      const text = `${h.line1} ${h.line2}`.toLowerCase();
      for (const banned of ['anxiety', 'depress', 'risk', 'diagnos']) {
        expect(text).not.toContain(banned);
      }
    }
  });
});

/* ————————————————— Feature extraction (pure) ————————————————— */

function mkEvents(specs) {
  // specs: [[gapMs, isCorrection], ...] — first event is t=0 baseline.
  let t = 0;
  const events = [];
  for (const [gap, isCorrection] of specs) {
    t += gap;
    events.push({ t, isCorrection: Boolean(isCorrection) });
  }
  return events;
}

describe('extractFeatures', () => {
  const start = 0;

  it('returns null below the minimum event threshold', () => {
    const events = mkEvents([[100, false], [110, false], [105, false]]);
    expect(extractFeatures(events, start, 400)).toBeNull();
  });

  it('computes finite numeric features for a steady session', () => {
    const events = mkEvents(
      Array.from({ length: 30 }, () => [120, false])
    );
    const f = extractFeatures(events, start, events[events.length - 1].t);
    expect(f).not.toBeNull();
    for (const key of ['typingSpeed', 'meanPauseMs', 'pauseStdDevMs', 'correctionRate', 'timingVariance', 'burstCount', 'sessionDuration']) {
      expect(typeof f[key]).toBe('number');
      expect(Number.isFinite(f[key])).toBe(true);
    }
    expect(f.typingSpeed).toBeGreaterThan(0);
    expect(f.correctionRate).toBe(0);
    // 120ms gaps → no pauses above the 500ms threshold
    expect(f.meanPauseMs).toBe(600); // documented default when no pauses occur
  });

  it('detects pauses above the threshold', () => {
    const events = mkEvents([
      [100, false], [110, false], [700, false], [120, false], [800, false],
      [110, false], [105, false], [690, false], [115, false], [125, false],
    ]);
    const f = extractFeatures(events, start, events[events.length - 1].t);
    expect(f.meanPauseMs).toBeGreaterThan(PAUSE_THRESHOLD_MS);
    expect(f.pauseStdDevMs).toBeGreaterThan(0);
  });

  it('counts corrections and computes their rate', () => {
    const events = mkEvents([
      [100, false], [100, false], [100, true], [100, false], [100, false],
      [100, true], [100, false], [100, false], [100, false], [100, false],
    ]);
    const f = extractFeatures(events, start, events[events.length - 1].t);
    expect(f.correctionRate).toBeGreaterThan(0);
    expect(f.correctionRate).toBeLessThan(0.5);
  });

  it('clamps absurd WPM values into a human range', () => {
    // 10 events within ~0.4s would be an absurd raw WPM
    const events = mkEvents(Array.from({ length: 10 }, () => [40, false]));
    const f = extractFeatures(events, start, events[events.length - 1].t);
    expect(f.typingSpeed).toBeLessThanOrEqual(180);
    expect(f.typingSpeed).toBeGreaterThanOrEqual(5);
  });

  it('handles zero-variance input without producing NaN', () => {
    const events = mkEvents(Array.from({ length: 12 }, () => [200, false]));
    const f = extractFeatures(events, start, events[events.length - 1].t);
    expect(Number.isNaN(f.timingVariance)).toBe(false);
    expect(Number.isNaN(f.pauseStdDevMs)).toBe(false);
  });

  it('never includes text-like fields', () => {
    const events = mkEvents(
      Array.from({ length: 8 }, () => [150, false])
    );
    const f = extractFeatures(events, start, events[events.length - 1].t);
    const keys = Object.keys(f);
    for (const key of keys) {
      expect(typeof f[key]).toBe('number');
    }
  });
});
