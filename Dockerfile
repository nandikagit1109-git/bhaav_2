FROM node:20-alpine

# System deps for building the client
RUN apk add --no-cache python3 make g++

# Create app directories
RUN mkdir -p /app/server/data /app/client

WORKDIR /app

# ── Install server dependencies (cached) ────────────────────────
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --production

# ── Install client dependencies (cached) ────────────────────────
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

# ── Copy source ─────────────────────────────────────────────────
COPY server/ ./server/
COPY client/ ./client/

# ── Build client ────────────────────────────────────────────────
RUN cd client && npm run build

# ── Serve built client from the server ──────────────────────────
# (Express static middleware will serve client/dist)

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8787}/api/health || exit 1

EXPOSE 8787

WORKDIR /app/server
CMD ["node", "src/index.js"]
