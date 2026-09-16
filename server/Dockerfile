FROM node:20-alpine

WORKDIR /app

# Install dependencies first (Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8787/api/health || exit 1

EXPOSE 8787

CMD ["node", "src/index.js"]
