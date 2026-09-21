/**
 * BHAAV — Insight Generation
 *
 * Generates weekly writing-rhythm insights using Claude (when available)
 * with a deterministic fallback (always).
 *
 * Key updates from v1:
 *   - Prompt includes directional info (concerning vs favorable changes)
 *   - Fallback considers direction (never says "different" for favorable weeks)
 *   - Smoothed deviation data for more stable observations
 */

import { FEATURE_KEYS, FEATURE_DIRECTION } from "./featureExtraction.js";
import { summarizeDirection } from "./baseline.js";

// ── Copy Maps ────────────────────────────────────────────────────────────────

/**
 * Per-feature observation/suggestion copy for the fallback insight.
 * Only used for concerning-direction features.
 */
const FEATURE_COPY = {
  meanPauseMs: {
    observation: "Your writing sessions were more interrupted than your usual pattern this week.",
    suggestion: "Try one uninterrupted 10-minute writing session before your next busy block.",
  },
  pauseStdDevMs: {
    observation: "Pause length varied more than your usual rhythm this week.",
    suggestion: "Give yourself a short, protected window to write without switching tasks.",
  },
  timingVariance: {
    observation: "This week's rhythm was noticeably more variable than your baseline.",
    suggestion: "Write at one consistent time of day and see whether the line steadies.",
  },
  typingSpeed: {
    observation: "Your typing pace sat farther from your usual rhythm than it typically does.",
    suggestion: "Next session, write a little slower than you think you need to.",
  },
  correctionRate: {
    observation: "You revised more than usual while writing this week.",
    suggestion: "Try a draft where you keep moving forward and edit only after ten minutes.",
  },
  longPauseRate: {
    observation: "You had more extended pauses than usual this week.",
    suggestion: "Try setting a 5-minute timer to write without looking away from the screen.",
  },
  correctionBurstRate: {
    observation: "Your revisions came in bigger clusters than your usual pattern.",
    suggestion: "Write freely for ten minutes, then go back and revise in one pass.",
  },
  speedDecay: {
    observation: "Your writing pace slowed more toward the end of sessions than usual.",
    suggestion: "Try shorter, 7-minute sessions to see if the rhythm stays steadier.",
  },
};

/**
 * Favorable-direction copy — used when the dominant change is positive.
 */
const FAVORABLE_COPY = {
  observation: "Your writing rhythm was smoother and more consistent than usual this week.",
  suggestion: "Whatever you're doing is working — keep the same quiet writing window.",
};

/**
 * Calm copy — when deviation is low.
 */
const CALM_COPY = {
  observation: "Your writing rhythm stayed close to your own usual pattern this week.",
  suggestion: "Keep the same quiet writing window. Consistency is the signal.",
};

/**
 * NOTE: We intentionally do NOT implement:
 * - Any feature claiming backspace rate alone indicates mood state
 *   (Liu et al., JMIR 2024 found raw backspace rate did not significantly
 *   differ between groups — only multi-feature patterns were predictive)
 * - Any claim that keystroke data can predict specific clinical conditions
 *   (adolescent studies found weak/no predictive associations — this is why
 *   Bhaav stays framed as self-awareness, never diagnostic)
 */

/**
 * Mixed copy — when there are both concerning and favorable signals.
 */
const MIXED_COPY = {
  observation: "Your writing pattern showed some shifts this week, with both familiar and new rhythms.",
  suggestion: "Notice which sessions felt natural — that's your baseline trying to tell you something.",
};

// ── Fallback Insight ─────────────────────────────────────────────────────────

/**
 * Generate a deterministic insight without calling the API.
 * Always available, never fails.
 *
 * @param {object} payload - { score, direction, previousFeedback, supportLevel }
 * @returns {object} insight with observation and suggestion
 */
export function fallbackInsight({ score, direction, previousFeedback, supportLevel }) {
  if (!score?.ready) {
    return {
      observation: "We're still learning your usual rhythm. Early sessions are for listening, not interpreting.",
      suggestion: "Write a few more ordinary sessions so Bhaav can learn what normal looks like for you.",
      source: "fallback",
    };
  }

  // Choose base copy based on direction
  let base;
  if (score.deviation < 0.8) {
    base = CALM_COPY;
  } else if (direction?.overall === "favorable") {
    base = FAVORABLE_COPY;
  } else if (direction?.overall === "mixed") {
    base = MIXED_COPY;
  } else {
    // Concerning or neutral — use feature-specific copy
    base = FEATURE_COPY[score.dominantFeature] || CALM_COPY;
  }

  let suggestion = base.suggestion;
  if (supportLevel === "awareness") {
    suggestion = "No action is required. This is simply a record of how this week compared with your own baseline.";
  }
  if (previousFeedback === "not_really") {
    suggestion =
      "Last time the suggestion didn't land. This week, ignore tactics—just notice whether an uninterrupted session feels different.";
  } else if (previousFeedback === "a_little") {
    suggestion = `${base.suggestion} Last week's small shift is worth repeating once.`;
  }

  return {
    observation: base.observation,
    suggestion,
    source: "fallback",
  };
}

// ── LLM Insight Prompt ───────────────────────────────────────────────────────

/**
 * Build the prompt for Claude, including directional information.
 *
 * @param {object} payload - score, baseline, smoothed, direction, etc.
 * @returns {string} prompt text
 */
export function insightPrompt(payload) {
  const { score, baseline, smoothed, direction, latest, previousFeedback, supportLevel } = payload;

  // Build the data summary for Claude
  const dataSummary = {
    // Current session vs baseline
    sessionDeviation: score?.deviation,
    dominantFeature: score?.dominantFeature,
    zScores: score?.zScores,

    // Smoothed (multi-session average) for stability
    smoothedDeviation: smoothed?.deviation,
    smoothedZScores: smoothed?.zScores,

    // Direction summary — tells Claude what's concerning vs favorable
    direction: direction,

    // Baseline info
    baselineReady: baseline?.ready,
    baselineSessionCount: baseline?.sessionCount,

    // Latest session features (for context)
    latestSession: latest,

    // Session duration context (BiAffect 2020 found shorter sessions associated
    // with depression severity — include baseline vs current so Claude can note
    // duration shifts when relevant)
    baselineSessionDurationMinutes: baseline?.features?.sessionDurationMinutes?.median ?? null,
    currentSessionDurationMinutes: latest?.sessionDurationMinutes ?? null,

    // User preferences
    supportLevel,
    previousFeedback,
  };

  return `You help Bhaav, a privacy-preserving writing-rhythm awareness tool.
You receive ONLY aggregate typing-behavior statistics for one person compared with THEIR OWN baseline.
You must NEVER diagnose, mention depression, anxiety, suicide, disorder, risk, clinical terms, or mental illness.
You must NEVER claim medical accuracy.

IMPORTANT: The "direction" field tells you whether changes are concerning (worse), favorable (better), or mixed.
- If direction.overall is "favorable", the user is typing MORE fluently than usual. Say something positive.
- If direction.overall is "concerning", note the specific concern honestly but gently.
- If direction.overall is "mixed", acknowledge both the shifts and what's stayed steady.
- If direction.overall is "neutral" or deviation is low, focus on consistency.

Session duration context: The baselineSessionDurationMinutes is the user's typical session length.
The currentSessionDurationMinutes is this week's average. Shorter sessions can indicate lower
energy or engagement — mention this if it's notably shorter than baseline, but never frame it
as a clinical symptom.

Write two short sentences for students/young adults. Tone: quiet, specific, non-alarmist.

Return strict JSON: {"observation":"...","suggestion":"..."}

Data:
${JSON.stringify(dataSummary, null, 2)}`;
}

// ── Insight Generation ───────────────────────────────────────────────────────

/**
 * Generate a weekly insight, using Claude when available and fallback otherwise.
 *
 * @param {object} payload - full payload with score, baseline, smoothed, direction, etc.
 * @returns {object} insight with observation and suggestion
 */
export async function generateInsight(payload) {
  const fallback = fallbackInsight(payload);
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return fallback;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: insightPrompt(payload) }],
      }),
    });
    clearTimeout(timer);
    if (!response.ok) return fallback;
    const data = await response.json();
    const text = data?.content?.[0]?.text || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (typeof parsed.observation !== "string" || typeof parsed.suggestion !== "string") {
      return fallback;
    }
    const banned = /(depress|anxi|suicid|diagnos|disorder|mental illness|at risk)/i;
    if (banned.test(parsed.observation) || banned.test(parsed.suggestion)) return fallback;
    return {
      observation: parsed.observation.slice(0, 280),
      suggestion: parsed.suggestion.slice(0, 280),
      source: "anthropic",
    };
  } catch {
    return fallback;
  }
}
