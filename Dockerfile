FROM node:22.16.0-slim
LABEL org.opencontainers.image.title="auto-crm" \
      org.opencontainers.image.source="https://github.com/matiasbongiovanni/auto-crm"

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create data directory with correct permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Copy entrypoint before switching user (requires root to write to /usr/local/bin)
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as non-root user
USER node

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/exchange',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
