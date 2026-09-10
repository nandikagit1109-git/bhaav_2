/**
 * Bhaav API Client — Adapted for BHAAV2 backend
 * Maps bhaav3-style calls to BHAAV2's actual endpoints.
 */

const API_BASE = '/api';

/* ── Deviation scale ─────────────────────────────────────────────────
 * The server computes deviation as the root-mean-square of z-scores across
 * the five behavioral features — i.e. distance in σ units (0–8, "high"
 * threshold 1.65σ). The UI presents it on a 0–100 scale so the number reads
 * as "distance from your own rhythm" without fake precision. This is the
 * ONLY conversion point; server statistics stay untouched.
 * ─────────────────────────────────────────────────────────────────── */
export const HIGH_DEVIATION_SIGMA = 1.65;

export function sigmaToScore(sigma) {
  const s = Number(sigma);
  if (!Number.isFinite(s) || s < 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (s / HIGH_DEVIATION_SIGMA) * 100)));
}

export function scoreToSigma(score) {
  const x = Number(score);
  if (!Number.isFinite(x)) return 0;
  return (x / 100) * HIGH_DEVIATION_SIGMA;
}

function userHeaders() {
  return { 'Content-Type': 'application/json' };
}

// ── Health ──────────────────────────────────────────
export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

// ── State (sessions + baseline + insight + settings) ──
export async function fetchState() {
  const res = await fetch(`${API_BASE}/state`, { headers: userHeaders() });
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

// ── Sessions ────────────────────────────────────────
export async function fetchSessions() {
  const state = await fetchState();
  // BHAAV2 returns camelCase (createdAt, typingSpeed, deviation, etc.)
  // Map to the names the dashboard components expect
  const sessions = (state.sessions || []).map(s => ({
    id: s.id,
    created_at: s.createdAt,
    typing_speed: s.typingSpeed,
    mean_pause_ms: s.meanPauseMs,
    correction_rate: s.correctionRate,
    timing_variance: s.timingVariance,
    // Server deviation is σ-units (RMS z); presented on the 0–100 scale.
    deviation_score: s.deviation != null ? sigmaToScore(s.deviation) : 0,
    session_duration: s.sessionDuration,
  }));
  return { sessions };
}

export async function fetchBaseline() {
  const state = await fetchState();
  const b = state.baseline;
  if (!b || !b.ready) {
    return { baseline: null };
  }
  // Server returns features like { typingSpeed: { mean, stdDev }, meanPauseMs: { mean, stdDev } }
  return {
    baseline: {
      mean_speed: b.features?.typingSpeed?.mean,
      mean_pause: b.features?.meanPauseMs?.mean,
      std_speed: b.features?.typingSpeed?.stdDev,
      std_pause: b.features?.meanPauseMs?.stdDev,
      sessionCount: b.sessionCount ?? 0,
      minRequired: b.minRequired ?? 6,
    }
  };
}

export async function fetchLatestDeviation() {
  const state = await fetchState();
  const s = state.latest;
  if (!s) return { deviation: null };
  return {
    deviation: {
      score: s.deviation ?? 0,
      dominantFeature: null,
      sessionsRecorded: (state.sessions || []).length,
    }
  };
}

export async function submitSessionTelemetry(telemetry) {
  const cleanPayload = {
    typingSpeed: Number(telemetry.typingSpeed) || 0,
    meanPauseMs: Number(telemetry.meanPauseMs) || 0,
    pauseStdDevMs: Number(telemetry.pauseStdDevMs) || 0,
    correctionRate: Number(telemetry.correctionRate) || 0,
    timingVariance: Number(telemetry.timingVariance) || 0,
    burstCount: Number(telemetry.burstCount) || 0,
    sessionDuration: Number(telemetry.sessionDuration) || 0,
  };

  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: userHeaders(),
    body: JSON.stringify(cleanPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to record session');
  }

  const data = await res.json();

  // Map BHAAV2 response to bhaav3-compatible shape
  return {
    id: data.id,
    createdAt: data.createdAt,
    metrics: {
      typingSpeed: data.typingSpeed,
      meanPauseMs: data.meanPauseMs,
      correctionRate: data.correctionRate,
      timingVariance: data.timingVariance,
    },
    evaluation: {
      // Server deviation is σ-units; present as 0–100 "distance from your rhythm".
      deviationScore: sigmaToScore(data.deviation ?? 0),
      deviationSigma: data.deviation ?? 0,
      dominantFeature: data.dominantFeature,
      zSpeed: data.zScores?.typingSpeed ?? 0,
      zPause: data.zScores?.meanPauseMs ?? 0,
      zCorrection: data.zScores?.correctionRate ?? 0,
      zVariance: data.zScores?.timingVariance ?? 0,
      highDeviation: data.highDeviation,
      status: data.baseline?.ready ? 'evaluated' : 'learning',
      // sessionCount = baseline size (sessions BEFORE this one)
      sessionsRecorded: (data.baseline?.sessionCount ?? 0) + 1,
      sessionsRequired: data.baseline?.minRequired ?? 6,
    },
    baseline: data.baseline,
  };
}

// ── Insights ────────────────────────────────────────
export async function fetchWeeklyInsight() {
  const res = await fetch(`${API_BASE}/insights/weekly`, {
    method: 'POST',
    headers: userHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch insight');
  const data = await res.json();
  return {
    insight: {
      id: data.id,
      observation: data.observation,
      suggestion: data.suggestion,
      source: data.source,
      feedback_status: data.feedback || null,
    }
  };
}

export async function submitInsightFeedback(feedbackStatus, insightId) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: userHeaders(),
    body: JSON.stringify({ response: feedbackStatus, insightId }),
  });
  if (!res.ok) throw new Error('Failed to record feedback');
  return res.json();
}

// ── Campus ──────────────────────────────────────────
export async function fetchCampusCohorts() {
  // BHAAV2 doesn't have a cohorts endpoint; return a single default cohort
  return { cohorts: [{ cohortId: 'campus_general', cohortName: 'Campus-Wide (All Opted In)', participantCount: 17, meetsPrivacyFloor: true }] };
}

export async function fetchCampusPulse() {
  const res = await fetch(`${API_BASE}/campus`, { headers: userHeaders() });
  const data = await res.json();

  if (res.status === 403) {
    return {
      ok: false,
      status: 403,
      privacyBlocked: true,
      participantCount: data.participantCount || 0,
      requiredThreshold: data.requiredThreshold || 10,
    };
  }

  return {
    ok: true,
    status: 200,
    meanDeviation: Math.round(data.currentDeviation ?? 0),
    participantCount: data.participantCount ?? 0,
    minGroupSize: data.minGroupSize ?? 10,
    trendDirection: data.direction || 'higher',
    delta: data.delta ?? null,
    trendDescription: data.message || 'Aggregate writing patterns are showing a shift from the recent baseline.',
    weeks: (data.weeks || []).map(w => ({
      week: w.week,
      meanDeviation: Math.round((w.meanDeviation ?? 0) * 10) / 10,
      sessions: w.sessions ?? 0,
    })),
  };
}

// ── Settings ────────────────────────────────────────
export async function fetchSettings() {
  const state = await fetchState();
  const s = state.settings || {};
  return {
    settings: {
      supportLevel: s.support_level || 'suggestions',
      trustedName: s.trusted_name || '',
      trustedChannel: s.trusted_channel || '',
      campusOptIn: s.campus_opt_in !== 0,
    }
  };
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: userHeaders(),
    body: JSON.stringify({
      supportLevel: settings.supportLevel,
      trustedName: settings.trustedName,
      trustedChannel: settings.trustedChannel,
      campusOptIn: settings.campusOptIn,
    }),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function reseedDemoData() {
  const res = await fetch(`${API_BASE}/demo/seed`, {
    method: 'POST',
    headers: userHeaders(),
  });
  if (!res.ok) throw new Error('Failed to seed demo data');
  return res.json();
}

// ── Data Management ─────────────────────────────────
export async function exportUserData() {
  const res = await fetch(`${API_BASE}/export`, { headers: userHeaders() });
  if (!res.ok) throw new Error('Failed to export data');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bhaav-data-export-${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

export async function deleteUserData() {
  const res = await fetch(`${API_BASE}/me`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user data');
  return res.json();
}
