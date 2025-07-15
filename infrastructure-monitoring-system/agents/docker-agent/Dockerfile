# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the application with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -a -installsuffix cgo \
    -ldflags='-w -s -extldflags "-static"' \
    -o docker-agent .

# Final stage - minimal runtime image
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata curl

# Create non-root user
RUN addgroup -g 1000 sams && \
    adduser -D -s /bin/sh -u 1000 -G sams sams

WORKDIR /app

# Copy the binary
COPY --from=builder /app/docker-agent /app/docker-agent

# Copy default configuration
COPY agent_config.json /app/agent_config.json

# Create logs directory
RUN mkdir -p /app/logs && chown -R sams:sams /app

# Add labels for better container management
LABEL maintainer="SAMS Team" \
      version="1.0.0" \
      description="SAMS Docker Infrastructure Monitoring Agent" \
      com.sams.service="docker-agent" \
      com.sams.component="infrastructure-monitoring"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use non-root user for security
USER sams:sams

# Expose metrics port
EXPOSE 8080

# Set environment variables
ENV DOCKER_API_VERSION=1.41
ENV LOG_LEVEL=info
ENV METRICS_INTERVAL=30

# Run the agent
ENTRYPOINT ["/app/docker-agent"]
CMD ["/app/agent_config.json"]
