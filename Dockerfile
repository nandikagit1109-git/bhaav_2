FROM node:20-alpine

WORKDIR /app/server

# Install dependencies first (Docker layer caching)
COPY server/package.json server/package-lock.json ./
RUN npm ci --production

# Copy server source
COPY server/ ./

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8787}/api/health || exit 1

EXPOSE 8787

CMD ["node", "src/index.js"]
