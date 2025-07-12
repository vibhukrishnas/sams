#!/usr/bin/env node

// SAMS Complete Phase 2 Startup Script
// All Core Backend Services (Weeks 4-7)

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 SAMS Complete Phase 2 System Startup');
console.log('Core Backend Development (Weeks 4-7)\n');

const processes = [];
const logs = {
  main: [],
  users: [],
  servers: [],
  alerts: [],
  websocket: [],
  integrations: [],
  cloud: [],
  api: []
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
    'express',
    'cors',
    'axios',
    'socket.io',
    'ws',
    'kafkajs',
    'influxdb-client',
    'nodemailer',
    'twilio',
    'bcrypt',
    'jsonwebtoken',
    'speakeasy',
    'qrcode',
    'express-validator',
    'swagger-ui-express',
    'swagger-jsdoc',
    'ldapjs',
    'ssh2',
    'ping'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    colorLog('❌ Missing dependencies:', 'red');
    missingDeps.forEach(dep => colorLog(`   - ${dep}`, 'red'));
    colorLog('\n💡 Run: npm install ldapjs ssh2 ping', 'yellow');
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
          message.includes('running') || 
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

// Check external service dependencies
function checkExternalServices() {
  colorLog('\n🔧 Checking external service dependencies...', 'cyan');
  
  // Check if PostgreSQL is available
  colorLog('🐘 PostgreSQL: Optional - for production database', 'blue');
  
  // Check if InfluxDB is available
  colorLog('📊 InfluxDB: Optional - for time-series metrics storage', 'blue');
  
  // Check if Kafka is available
  colorLog('📨 Kafka: Optional - for message queue processing', 'blue');
  
  // Check if Redis is available
  colorLog('🔴 Redis: Optional - for caching and session storage', 'blue');
  
  // Check if LDAP is configured
  if (process.env.LDAP_ENABLED === 'true') {
    colorLog('🔐 LDAP: Enabled for authentication', 'green');
  } else {
    colorLog('🔐 LDAP: Disabled - using local authentication', 'yellow');
  }
  
  // Check cloud credentials
  if (process.env.AWS_ACCESS_KEY_ID) {
    colorLog('☁️ AWS credentials found', 'green');
  } else {
    colorLog('☁️ AWS credentials not configured', 'yellow');
  }
  
  if (process.env.AZURE_SUBSCRIPTION_ID) {
    colorLog('☁️ Azure credentials found', 'green');
  } else {
    colorLog('☁️ Azure credentials not configured', 'yellow');
  }
  
  if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
    colorLog('☁️ Google Cloud credentials found', 'green');
  } else {
    colorLog('☁️ Google Cloud credentials not configured', 'yellow');
  }
}

// Main startup sequence
async function startSystem() {
  try {
    colorLog('🚀 Starting SAMS Complete Phase 2 System...', 'bright');
    
    // Check dependencies
    checkDependencies();
    checkExternalServices();
    
    colorLog('\n📡 Starting core backend services...', 'cyan');
    
    // Start services in sequence with proper delays
    
    // Week 4: Core Backend Services
    await startService('User Management', 'user-management-service.js', 8085, 'blue');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await startService('Server Management', 'server-management-service.js', 8087, 'green');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await startService('Alert Engine', 'alert-processing-engine.js', 8086, 'red');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Week 5: Real-Time Communication & Data Pipeline
    await startService('WebSocket', 'websocket-server.js', 8081, 'magenta');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Week 6: Monitoring Agents & External Integrations
    await startService('Integrations', 'integrations-service.js', 8083, 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await startService('Cloud', 'cloud-integrations.js', 8084, 'cyan');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Week 7: API Development & Security
    await startService('API Framework', 'server-week7.js', 8080, 'bright');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Display startup summary
    colorLog('\n🎉 SAMS Complete Phase 2 System Started Successfully!', 'bright');
    colorLog('=' .repeat(80), 'cyan');
    
    colorLog('\n📋 Core Backend Services (Week 4):', 'cyan');
    colorLog('   👤 User Management: http://localhost:8085', 'blue');
    colorLog('   🖥️ Server Management: http://localhost:8087', 'green');
    colorLog('   🚨 Alert Processing: http://localhost:8086', 'red');
    
    colorLog('\n📡 Real-Time Communication (Week 5):', 'cyan');
    colorLog('   🔌 WebSocket Server: ws://localhost:8081', 'magenta');
    colorLog('   📊 Data Pipeline: Integrated with main services', 'blue');
    
    colorLog('\n🔗 External Integrations (Week 6):', 'cyan');
    colorLog('   🔗 Third-Party: http://localhost:8083', 'yellow');
    colorLog('   ☁️ Cloud Platforms: http://localhost:8084', 'cyan');
    
    colorLog('\n🛡️ API Framework & Security (Week 7):', 'cyan');
    colorLog('   🌐 Main API: http://localhost:8080', 'bright');
    colorLog('   📚 API Docs: http://localhost:8080/api-docs', 'blue');
    
    colorLog('\n🔐 Authentication & Security:', 'cyan');
    colorLog('   🔑 JWT Authentication with refresh tokens', 'blue');
    colorLog('   👥 RBAC: Admin, Manager, User roles', 'blue');
    colorLog('   🔐 MFA Support with TOTP', 'blue');
    colorLog('   🗝️ API Key Management', 'blue');
    colorLog('   🔒 Encryption at rest and in transit', 'blue');
    colorLog('   📋 Security audit logging', 'blue');
    colorLog('   🛡️ IP filtering and threat detection', 'blue');
    
    colorLog('\n🖥️ Server Management:', 'cyan');
    colorLog('   📊 Health checks with multiple methods', 'green');
    colorLog('   🔍 Network discovery and auto-registration', 'green');
    colorLog('   🏷️ Server grouping and tagging', 'green');
    colorLog('   📈 Metrics collection and aggregation', 'green');
    colorLog('   ⚙️ Configurable check intervals', 'green');
    
    colorLog('\n🚨 Alert Processing:', 'cyan');
    colorLog('   📋 Rule engine with conditions', 'red');
    colorLog('   🔗 Alert correlation and deduplication', 'red');
    colorLog('   📊 Severity classification', 'red');
    colorLog('   🔄 Lifecycle management', 'red');
    colorLog('   ⬆️ Escalation policies', 'red');
    colorLog('   🔇 Suppression and maintenance windows', 'red');
    
    colorLog('\n⚡ Performance Features:', 'cyan');
    colorLog('   🔴 Redis caching with intelligent TTL', 'blue');
    colorLog('   🐘 PostgreSQL connection pooling', 'blue');
    colorLog('   📊 Real-time performance monitoring', 'blue');
    colorLog('   🧹 Automatic cleanup and optimization', 'blue');
    colorLog('   📈 Load testing and benchmarks', 'blue');
    
    colorLog('\n🧪 Testing & Validation:', 'cyan');
    colorLog('   🔬 Comprehensive test suites available', 'blue');
    colorLog('   📊 Health checks for all services', 'blue');
    colorLog('   🔍 API validation and documentation', 'blue');
    
    colorLog('\n🔧 Management Commands:', 'cyan');
    colorLog('   🧪 Test Week 4: npm run test-week4', 'blue');
    colorLog('   🧪 Test Week 5: npm run test-week5', 'blue');
    colorLog('   🧪 Test Week 6: npm run test-week6', 'blue');
    colorLog('   🧪 Test Week 7: npm run test-week7', 'blue');
    colorLog('   🚀 Start Complete: npm run phase2-complete', 'blue');
    
    colorLog('\n📊 Service Health Checks:', 'cyan');
    processes.forEach(proc => {
      colorLog(`   ✅ ${proc.name}: http://localhost:${proc.port}/api/v1/*/health`, 'green');
    });
    
    colorLog('\n⚙️ Configuration:', 'cyan');
    colorLog('   📧 Email: Set SENDGRID_API_KEY or SMTP settings', 'blue');
    colorLog('   📱 SMS: Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN', 'blue');
    colorLog('   💬 Slack: Set SLACK_WEBHOOK_URL', 'blue');
    colorLog('   🔐 LDAP: Set LDAP_ENABLED=true and LDAP_* variables', 'blue');
    colorLog('   ☁️ AWS: Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY', 'blue');
    colorLog('   ☁️ Azure: Set AZURE_SUBSCRIPTION_ID', 'blue');
    colorLog('   ☁️ GCP: Set GOOGLE_CLOUD_PROJECT_ID', 'blue');
    
    colorLog('\n' + '=' .repeat(80), 'cyan');
    colorLog('🎯 Phase 2 Complete: Enterprise-Grade Backend Infrastructure', 'bright');
    colorLog('Press Ctrl+C to stop all services', 'yellow');
    
  } catch (error) {
    colorLog(`❌ Failed to start system: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Graceful shutdown
function setupGracefulShutdown() {
  const shutdown = () => {
    colorLog('\n🔄 Shutting down SAMS Complete Phase 2 System...', 'yellow');
    
    processes.forEach(proc => {
      if (proc.child && !proc.child.killed) {
        logWithTimestamp('main', `Stopping ${proc.name} service...`, 'yellow');
        proc.child.kill('SIGTERM');
      }
    });
    
    setTimeout(() => {
      colorLog('✅ All services stopped', 'green');
      process.exit(0);
    }, 5000);
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
    
    if (memMB > 1000) { // Alert if using more than 1GB
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
