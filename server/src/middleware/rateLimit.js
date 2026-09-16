// ═══════════════════════════════════════════════════════════════════
// BHAAV — Rate Limiting Middleware
//
// Protects high-cost write endpoints from abuse at scale:
//   POST /api/sessions      — 20 req/min per user
//   POST /api/insights/weekly — 5 req/min per user (calls LLM)
//   POST /api/feedback      — 30 req/min per user
//   All other POST/PUT/DELETE — 60 req/min per user
//
// Uses express-rate-limit with an in-memory store by default.
// For multi-instance deployments, swap MemoryStore for a Redis store
// (e.g. rate-limit-redis) — but the in-memory store is fine for
// single-instance and development.
//
// Keyed by x-bhaav-user header (or IP as fallback) so each user
// gets their own limit — one abuser can't block another.
// ═══════════════════════════════════════════════════════════════════

import rateLimit from "express-rate-limit";

// ── Session endpoint: 20 writes/min per user ──────────────────────
// Sessions are the most frequent write. 20/min is generous for normal
// use (most users write 1 session every few minutes) but blocks
// scripted abuse that would flood the baseline.
export const sessionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.header("x-bhaav-user") || req.ip,
  message: {
    error: "Too many sessions. Please wait a moment before writing again.",
    retryAfterSeconds: 60,
  },
  // Skip health checks
  skip: (req) => req.path === "/api/health",
});

// ── Insight endpoint: 5 req/min per user ──────────────────────────
// The weekly insight may call Claude. 5/min prevents runaway
// LLM costs while still allowing retries after brief errors.
export const insightRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.header("x-bhaav-user") || req.ip,
  message: {
    error: "Insight requests are rate-limited. Please try again shortly.",
    retryAfterSeconds: 60,
  },
});

// ── Feedback endpoint: 30 req/min per user ────────────────────────
export const feedbackRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.header("x-bhaav-user") || req.ip,
  message: {
    error: "Too many feedback requests. Please try again shortly.",
    retryAfterSeconds: 60,
  },
});

// ── General write rate limit: 60 req/min per user ─────────────────
// Applied as a blanket to all other POST/PUT/DELETE endpoints.
export const generalWriteRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.header("x-bhaav-user") || req.ip,
  message: {
    error: "Too many requests. Please slow down.",
    retryAfterSeconds: 60,
  },
});
