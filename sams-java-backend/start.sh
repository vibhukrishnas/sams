#!/bin/bash

# 🚀 SAMS Java Backend - Quick Start Script

echo "🚀 Starting SAMS Java Backend..."
echo "=================================="

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java 17 or higher."
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | sed '/^1\./s///' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "❌ Java 17 or higher is required. Current version: $JAVA_VERSION"
    exit 1
fi

echo "✅ Java version: $(java -version 2>&1 | head -1)"

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "❌ Maven is not installed. Please install Maven 3.6 or higher."
    exit 1
fi

echo "✅ Maven version: $(mvn -version | head -1)"

# Build the application
echo ""
echo "🔨 Building SAMS Java Backend..."
mvn clean compile -q

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Run the application
echo ""
echo "🚀 Starting SAMS Java Backend Server..."
echo ""
echo "📊 Server will be available at: http://localhost:8080"
echo "🏥 Health Check: http://localhost:8080/api/v1/health"
echo "📈 Metrics: http://localhost:8080/api/v1/metrics/current"
echo "🖥️ Servers API: http://localhost:8080/api/v1/servers"
echo "🔌 WebSocket: ws://localhost:8080/ws"
echo "💾 H2 Database Console: http://localhost:8080/h2-console"
echo ""
echo "📱 Mobile App Compatible API Endpoints:"
echo "   - GET /api/v1/servers (list servers)"
echo "   - GET /api/v1/metrics/current (current metrics)"
echo "   - WebSocket /ws (real-time updates)"
echo ""
echo "🌐 Web Dashboard Compatible:"
echo "   - Real-time metrics broadcasting"
echo "   - Server status updates"
echo "   - Alert notifications"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="

mvn spring-boot:run
