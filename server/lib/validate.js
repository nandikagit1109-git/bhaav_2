/**
 * BHAAV — Input Validation
 *
 * Validates and sanitizes incoming session data.
 * Extended to accept the 3 new features alongside the original 5.
 */

import { FEATURE_BOUNDS } from "./featureExtraction.js";

// ── Forbidden Keys ───────────────────────────────────────────────────────────

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

// ── Validation Functions ─────────────────────────────────────────────────────

/**
 * Check if the payload contains any forbidden text fields.
 * These would indicate the client is sending actual journal content.
 *
 * @param {object} payload
 * @returns {boolean} true if forbidden fields are present
 */
export function hasForbiddenTextFields(payload) {
  if (!payload || typeof payload !== "object") return false;
  return Object.keys(payload).some((key) => FORBIDDEN_KEYS.includes(key.toLowerCase()));
}

/**
 * Sanitize and validate a session payload.
 *
 * Extracts only the allowed feature fields, clamps each to its
 * valid range, and rejects any payload containing journal text.
 *
 * Backward-compatible: accepts both old 5-feature and new 8-feature payloads.
 * If new features are missing, they default to 0.
 *
 * @param {object} payload - raw session data from client
 * @returns {object} sanitized session with all 8 features
 * @throws {Error} if forbidden text fields are present or required features missing
 */
export function sanitizeSession(payload) {
  if (hasForbiddenTextFields(payload)) {
    const error = new Error("Journal text is not accepted. Send behavioral features only.");
    error.status = 400;
    error.code = "TEXT_REJECTED";
    throw error;
  }

  const session = {};

  // Extract and clamp each feature
  for (const [key, [min, max]] of Object.entries(FEATURE_BOUNDS)) {
    const value = Number(payload?.[key]);

    // New features are optional — default to 0 if not provided
    if (!Number.isFinite(value)) {
      if (key === "longPauseRate" || key === "correctionBurstRate" || key === "speedDecay" || key === "sessionDurationMinutes") {
        session[key] = 0;
        continue;
      }
      // Original features are required
      const error = new Error(`Missing or invalid feature: ${key}`);
      error.status = 400;
      error.code = "INVALID_FEATURE";
      throw error;
    }

    session[key] = Math.min(max, Math.max(min, value));
  }

  return session;
}

/**
 * Assert that a user ID is valid.
 *
 * @param {string} id
 * @returns {string} the validated user ID
 * @throws {Error} if invalid
 */
export function assertUserId(id) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{2,64}$/.test(id)) {
    const error = new Error("Invalid user id");
    error.status = 400;
    throw error;
  }
  return id;
}
