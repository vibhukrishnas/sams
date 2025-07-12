# Multi-stage Docker build for SAMS Backend
# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript application
RUN npm run build

# Stage 2: Runtime stage
FROM node:18-alpine AS runtime

# Install necessary packages
RUN apk add --no-cache \
    curl \
    jq \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S sams && \
    adduser -S sams -u 1001 -G sams

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any additional runtime files
COPY --from=builder /app/migrations ./migrations

# Create necessary directories and set permissions
RUN mkdir -p /app/logs /app/uploads && \
    chown -R sams:sams /app

# Switch to non-root user
USER sams

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

# Labels for metadata
LABEL maintainer="SAMS Team <team@sams.com>"
LABEL version="1.0.0"
LABEL description="SAMS Backend API Server"
LABEL org.opencontainers.image.source="https://github.com/sams/backend"
LABEL org.opencontainers.image.documentation="https://docs.sams.com"
LABEL org.opencontainers.image.licenses="MIT"
