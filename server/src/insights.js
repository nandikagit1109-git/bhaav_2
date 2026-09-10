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
};

const CALM_COPY = {
  observation: "Your writing rhythm stayed close to your own usual pattern this week.",
  suggestion: "Keep the same quiet writing window. Consistency is the signal.",
};

export function fallbackInsight({ score, previousFeedback, supportLevel }) {
  if (!score?.ready) {
    return {
      observation: "We're still learning your usual rhythm. Early sessions are for listening, not interpreting.",
      suggestion: "Write a few more ordinary sessions so Bhaav can learn what normal looks like for you.",
      source: "fallback",
    };
  }

  const base =
    score.deviation < 0.8 ? CALM_COPY : FEATURE_COPY[score.dominantFeature] || CALM_COPY;

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

export function insightPrompt(payload) {
  return `You help Bhaav, a privacy-preserving writing-rhythm awareness tool.
You receive ONLY aggregate typing-behavior statistics for one person compared with THEIR OWN baseline.
You must NEVER diagnose, mention depression, anxiety, suicide, disorder, risk, clinical terms, or mental illness.
You must NEVER claim medical accuracy.
Write two short sentences for students/young adults. Tone: quiet, specific, non-alarmist.

Return strict JSON: {"observation":"...","suggestion":"..."}

Data:
${JSON.stringify(payload, null, 2)}`;
}

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
