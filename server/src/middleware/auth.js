// ═══════════════════════════════════════════════════════════════════
// BHAAV — JWT Authentication Middleware
//
// Verifies the Authorization: Bearer <token> header on protected routes.
// Attaches the decoded userId to req.userId for downstream handlers.
//
// Environment:
//   JWT_SECRET — signing key (required; generate a strong random string)
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
 * Express middleware: require a valid JWT.
 * Attaches req.userId from the token's `sub` claim.
 * Returns 401 if missing/invalid.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
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
