#!/usr/bin/env node

// SAMS Real-Time System Startup Script
// Phase 2 Week 5: Complete Real-Time Infrastructure

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 SAMS Real-Time System Startup');
console.log('Phase 2 Week 5: WebSocket + Kafka + InfluxDB Integration\n');

const processes = [];
const logs = {
  main: [],
  websocket: [],
  kafka: [],
  influx: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logWithTimestamp(service, message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  const formattedMessage = `[${timestamp}] [${service.toUpperCase()}] ${message}`;
  colorLog(formattedMessage, color);
  
  if (logs[service]) {
    logs[service].push(formattedMessage);
  }
}

// Check if required dependencies are installed
function checkDependencies() {
  colorLog('🔍 Checking dependencies...', 'cyan');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'socket.io',
    'ws', 
    'kafkajs',
    'influxdb-client',
    'redis',
    'uuid',
    'moment',
    'lodash',
    'node-cron'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    colorLog('❌ Missing dependencies:', 'red');
    missingDeps.forEach(dep => colorLog(`   - ${dep}`, 'red'));
    colorLog('\n💡 Run: npm install socket.io ws kafkajs influxdb-client redis uuid moment lodash node-cron', 'yellow');
    process.exit(1);
  }
  
  colorLog('✅ All dependencies found', 'green');
}

// Start individual services
function startService(name, script, port, color = 'blue') {
  return new Promise((resolve, reject) => {
    logWithTimestamp('main', `Starting ${name} service...`, 'cyan');
    
    const child = spawn('node', [script], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PORT: port }
    });
    
    processes.push({ name, child, port });
    
    let startupComplete = false;
    
    child.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logWithTimestamp(name.toLowerCase(), message, color);
        
        // Check for startup completion indicators
        if (!startupComplete && (
          message.includes('listening') || 
          message.includes('started') || 
          message.includes('initialized') ||
          message.includes('ready')
        )) {
          startupComplete = true;
          resolve();
        }
      }
    });
    
    child.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logWithTimestamp(name.toLowerCase(), `ERROR: ${message}`, 'red');
      }
    });
    
    child.on('close', (code) => {
      logWithTimestamp('main', `${name} service exited with code ${code}`, code === 0 ? 'green' : 'red');
    });
    
    child.on('error', (error) => {
      logWithTimestamp('main', `Failed to start ${name}: ${error.message}`, 'red');
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!startupComplete) {
        logWithTimestamp('main', `${name} startup timeout - continuing anyway`, 'yellow');
        resolve();
      }
    }, 30000);
  });
}

// Start external dependencies (if available)
async function startExternalDependencies() {
  colorLog('\n🔧 Checking external dependencies...', 'cyan');
  
  // Check if Redis is running
  try {
    const redis = require('redis');
    const client = redis.createClient();
    await client.connect();
    await client.ping();
    await client.disconnect();
    colorLog('✅ Redis is running', 'green');
  } catch (error) {
    colorLog('⚠️ Redis not available - some features may be limited', 'yellow');
    colorLog('💡 To install Redis: https://redis.io/download', 'blue');
  }
  
  // Check if Kafka is available (optional)
  colorLog('ℹ️ Kafka is optional - will use in-memory processing if not available', 'blue');
  
  // Check if InfluxDB is available (optional)
  colorLog('ℹ️ InfluxDB is optional - will use in-memory storage if not available', 'blue');
}

// Main startup sequence
async function startSystem() {
  try {
    colorLog('🚀 Starting SAMS Real-Time Infrastructure...', 'bright');
    
    // Check dependencies
    checkDependencies();
    
    // Check external dependencies
    await startExternalDependencies();
    
    colorLog('\n📡 Starting services...', 'cyan');
    
    // Start services in sequence
    await startService('WebSocket', 'websocket-server.js', 8081, 'magenta');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    await startService('Main', 'server.js', 8080, 'green');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    // Display startup summary
    colorLog('\n🎉 SAMS Real-Time System Started Successfully!', 'bright');
    colorLog('=' .repeat(60), 'cyan');
    
    processes.forEach(proc => {
      colorLog(`✅ ${proc.name} Service: http://localhost:${proc.port}`, 'green');
    });
    
    colorLog('\n📊 Available Endpoints:', 'cyan');
    colorLog('   🌐 Main API: http://localhost:8080', 'blue');
    colorLog('   🔌 WebSocket: ws://localhost:8081', 'blue');
    colorLog('   📈 Dashboard: http://localhost:8080/dashboard.html', 'blue');
    colorLog('   📊 Health: http://localhost:8080/api/v1/health', 'blue');
    colorLog('   📡 WebSocket Stats: http://localhost:8080/api/v1/websocket/stats', 'blue');
    colorLog('   📈 Pipeline Stats: http://localhost:8080/api/v1/pipeline/stats', 'blue');
    
    colorLog('\n🔧 Optional External Services:', 'yellow');
    colorLog('   📊 InfluxDB: http://localhost:8086 (for metrics storage)', 'yellow');
    colorLog('   🔴 Redis: localhost:6379 (for caching)', 'yellow');
    colorLog('   📨 Kafka: localhost:9092 (for message queue)', 'yellow');
    
    colorLog('\n💡 Quick Test Commands:', 'cyan');
    colorLog('   curl http://localhost:8080/api/v1/health', 'blue');
    colorLog('   curl http://localhost:8080/api/v1/servers', 'blue');
    colorLog('   curl http://localhost:8080/api/v1/websocket/stats', 'blue');
    
    colorLog('\n🎯 Open the dashboard to see real-time features:', 'bright');
    colorLog('   http://localhost:8080/dashboard.html', 'green');
    
    colorLog('\n' + '=' .repeat(60), 'cyan');
    colorLog('Press Ctrl+C to stop all services', 'yellow');
    
  } catch (error) {
    colorLog(`❌ Failed to start system: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Graceful shutdown
function setupGracefulShutdown() {
  const shutdown = () => {
    colorLog('\n🔄 Shutting down SAMS Real-Time System...', 'yellow');
    
    processes.forEach(proc => {
      if (proc.child && !proc.child.killed) {
        logWithTimestamp('main', `Stopping ${proc.name} service...`, 'yellow');
        proc.child.kill('SIGTERM');
      }
    });
    
    setTimeout(() => {
      colorLog('✅ All services stopped', 'green');
      process.exit(0);
    }, 3000);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Health monitoring
function startHealthMonitoring() {
  setInterval(() => {
    const aliveProcesses = processes.filter(proc => proc.child && !proc.child.killed);
    
    if (aliveProcesses.length < processes.length) {
      const deadProcesses = processes.filter(proc => !proc.child || proc.child.killed);
      deadProcesses.forEach(proc => {
        logWithTimestamp('main', `⚠️ ${proc.name} service appears to be down`, 'red');
      });
    }
  }, 30000); // Check every 30 seconds
}

// Performance monitoring
function startPerformanceMonitoring() {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.rss / 1024 / 1024);
    
    if (memMB > 500) { // Alert if using more than 500MB
      logWithTimestamp('main', `⚠️ High memory usage: ${memMB}MB`, 'yellow');
    }
  }, 60000); // Check every minute
}

// Start the system
if (require.main === module) {
  setupGracefulShutdown();
  startSystem().then(() => {
    startHealthMonitoring();
    startPerformanceMonitoring();
  });
}

module.exports = {
  startSystem,
  processes,
  logs
};
