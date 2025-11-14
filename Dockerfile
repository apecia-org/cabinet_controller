# Multi-stage Dockerfile for Cabinet Control API
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY .env.example .env

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:80/api/v1/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Run the application
CMD ["node", "src/server.js"]
