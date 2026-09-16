// ═══════════════════════════════════════════════════════════════════
// BHAAV — Redis Read-Through Cache
//
// Purpose: cache baseline lookups (the most-read query in the app)
// for ~10 minutes. Every call to GET /api/state and POST /api/insights
// reads the baseline; at scale this becomes the hot path.
//
// Design:
//   - Read-through: check Redis first, fall back to PG on miss
//   - Write-through: invalidate on baseline recompute (POST /api/sessions)
//   - Graceful degradation: if Redis is down, cache is a no-op passthrough
//   - No per-request state: the cache is a module-level singleton
//
// Environment:
//   REDIS_URL       — redis://host:port (optional; omit to disable caching)
//   CACHE_TTL_SECS  — TTL for baseline entries (default 600 = 10 min)
// ═══════════════════════════════════════════════════════════════════

import Redis from "ioredis";

const BASELINE_PREFIX = "bhaav:baseline:";
const DEFAULT_TTL = 600; // 10 minutes

let _redis = null;
let _enabled = false;

/**
 * Initialize Redis connection. Call once at startup.
 * If REDIS_URL is not set or connection fails, caching is silently disabled.
 */
export async function initCache() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("[cache] no REDIS_URL set — caching disabled (passthrough mode)");
    return;
  }

  try {
    _redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        // Give up after 3 retries; the app continues without cache
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    await _redis.connect();
    _enabled = true;
    console.log("[cache] Redis connected — baseline caching active");
  } catch (err) {
    console.warn("[cache] Redis connection failed:", err.message, "— running without cache");
    _redis = null;
    _enabled = false;
  }
}

/**
 * Get a cached baseline for a user.
 * @param {string} userId
 * @returns {Promise<Object|null>} — the cached baseline object, or null
 */
export async function getCachedBaseline(userId) {
  if (!_enabled || !_redis) return null;
  try {
    const raw = await _redis.get(`${BASELINE_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    // Redis error → treat as cache miss
    return null;
  }
}

/**
 * Store a baseline in the cache.
 * @param {string} userId
 * @param {Object} baseline — the buildBaseline() output
 * @param {number} ttlSeconds — override DEFAULT_TTL if needed
 */
export async function setCachedBaseline(userId, baseline, ttlSeconds = DEFAULT_TTL) {
  if (!_enabled || !_redis) return;
  try {
    await _redis.setex(
      `${BASELINE_PREFIX}${userId}`,
      ttlSeconds,
      JSON.stringify(baseline),
    );
  } catch {
    // Best-effort: cache write failure doesn't break the request
  }
}

/**
 * Invalidate (delete) the cached baseline for a user.
 * Called after POST /api/sessions (baseline recompute).
 * @param {string} userId
 */
export async function invalidateBaseline(userId) {
  if (!_enabled || !_redis) return;
  try {
    await _redis.del(`${BASELINE_PREFIX}${userId}`);
  } catch {
    // Best-effort: invalidation failure doesn't break the request
  }
}

/**
 * Invalidate ALL baselines (used during seed/reset).
 */
export async function invalidateAllBaselines() {
  if (!_enabled || !_redis) return;
  try {
    const keys = await _redis.keys(`${BASELINE_PREFIX}*`);
    if (keys.length) await _redis.del(...keys);
  } catch {
    // Best-effort
  }
}

/**
 * Close the Redis connection (call on SIGTERM).
 */
export async function closeCache() {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    _enabled = false;
  }
}

/**
 * Check if caching is active (for health checks).
 */
export function isCacheEnabled() {
  return _enabled;
}
