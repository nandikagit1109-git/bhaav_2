// ═══════════════════════════════════════════════════════════════════
// BHAAV — Authentication Middleware
//
// Primary identity: x-bhaav-user header (anonymous user_id from localStorage)
// Fallback: JWT token (for users who signed up with email/password)
//
// requireAuth extracts userId from EITHER source. If neither is present,
// it falls back to "demo" (backward compatibility).
//
// Environment:
//   JWT_SECRET — signing key (used only for email/password auth, optional)
//   JWT_EXPIRES_IN — token lifetime (default: "7d")
// ═══════════════════════════════════════════════════════════════════

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bhaav-dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generate a JWT for a user.
 * @param {string} userId
 * @returns {string} signed token
 */
export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT and return the payload.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws if token is invalid or expired
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Express middleware: extract userId from x-bhaav-user header or JWT token.
 *
 * This middleware NEVER returns 401 — it always calls next().
 * If a valid user identity is found, it's attached to req.userId.
 * If not, req.userId is set to "demo" for backward compatibility.
 *
 * The app works without any authentication. The user_id comes from
 * the client's localStorage (sent via x-bhaav-user header).
 */
export function requireAuth(req, _res, next) {
  // Priority 1: x-bhaav-user header (anonymous model)
  const headerUserId = req.header("x-bhaav-user");
  if (headerUserId && typeof headerUserId === "string" && headerUserId.length <= 64) {
    req.userId = headerUserId;
    return next();
  }

  // Priority 2: JWT token (email/password model, optional)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      req.userId = payload.sub;
      return next();
    } catch {
      // Invalid token — fall through to demo
    }
  }

  // Priority 3: fallback (backward compatibility)
  req.userId = "demo";
  next();
}

/**
 * Express middleware: optionally parse JWT if present.
 * If valid, attaches req.userId. If missing/invalid, continues without error.
 * Use on routes that work differently for authenticated vs anonymous users.
 */
export function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      req.userId = payload.sub;
    } catch {
      // Invalid token — continue without userId
    }
  }
  next();
}
