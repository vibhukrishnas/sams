# Multi-stage Docker build for SAMS Frontend
# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Runtime stage with Nginx
FROM nginx:1.25-alpine

# Install necessary packages
RUN apk add --no-cache \
    curl \
    jq \
    && rm -rf /var/cache/apk/*

# Copy built application from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy security headers configuration
COPY security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx-sams && \
    adduser -S nginx-sams -u 1001 -G nginx-sams

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx-sams:nginx-sams /var/cache/nginx /var/log/nginx /var/run /usr/share/nginx/html

# Switch to non-root user
USER nginx-sams

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Labels for metadata
LABEL maintainer="SAMS Team <team@sams.com>"
LABEL version="1.0.0"
LABEL description="SAMS Frontend Application"
LABEL org.opencontainers.image.source="https://github.com/sams/frontend"
LABEL org.opencontainers.image.documentation="https://docs.sams.com"
LABEL org.opencontainers.image.licenses="MIT"
