FROM node:20-alpine

# Create app dir and data dir with proper permissions
RUN mkdir -p /app/server/data

WORKDIR /app/server

# Install dependencies first (Docker layer caching)
COPY server/package.json server/package-lock.json ./
RUN npm ci --production

# Copy server source
COPY server/ ./

# Ensure data dir is writable
RUN chmod 777 /app/server/data

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8787}/api/health || exit 1

EXPOSE 8787

CMD ["node", "src/index.js"]
