const FORBIDDEN_KEYS = [
  "text",
  "content",
  "journal",
  "body",
  "message",
  "prompt",
  "characters",
  "keystrokes",
  "clipboard",
  "password",
  "email",
];

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
  sessionDurationMinutes: [0, 1440],
};

export function hasForbiddenTextFields(payload) {
  if (!payload || typeof payload !== "object") return false;
  return Object.keys(payload).some((key) => FORBIDDEN_KEYS.includes(key.toLowerCase()));
}

export function sanitizeSession(payload) {
  if (hasForbiddenTextFields(payload)) {
    const error = new Error("Journal text is not accepted. Send behavioral features only.");
    error.status = 400;
    error.code = "TEXT_REJECTED";
    throw error;
  }

  const session = {};
  for (const [key, [min, max]] of Object.entries(FEATURE_BOUNDS)) {
    const value = Number(payload?.[key]);
    if (!Number.isFinite(value)) {
      // New features default to 0 for backward compatibility
      if (key === "longPauseRate" || key === "correctionBurstRate" || key === "speedDecay" || key === "sessionDurationMinutes") {
        session[key] = 0;
        continue;
      }
      const error = new Error(`Missing or invalid feature: ${key}`);
      error.status = 400;
      error.code = "INVALID_FEATURE";
      throw error;
    }
    session[key] = Math.min(max, Math.max(min, value));
  }
  return session;
}

export function assertUserId(id) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{2,64}$/.test(id)) {
    const error = new Error("Invalid user id");
    error.status = 400;
    throw error;
  }
  return id;
}
