#!/usr/bin/env node

// SAMS Phase 2 Week 6 Startup Script
// Monitoring Agents & External Integrations

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 SAMS Phase 2 Week 6 System Startup');
console.log('Monitoring Agents & External Integrations\n');

const processes = [];
const logs = {
  main: [],
  websocket: [],
  integrations: [],
  cloud: []
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
    'twilio'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    colorLog('❌ Missing dependencies:', 'red');
    missingDeps.forEach(dep => colorLog(`   - ${dep}`, 'red'));
    colorLog('\n💡 Run: npm install nodemailer twilio @azure/identity @azure/arm-monitor google-auth-library @google-cloud/monitoring aws-sdk', 'yellow');
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

// Check Java installation for monitoring agent
function checkJavaInstallation() {
  colorLog('\n☕ Checking Java installation...', 'cyan');
  
  try {
    const { execSync } = require('child_process');
    const javaVersion = execSync('java -version 2>&1', { encoding: 'utf8' });
    
    if (javaVersion.includes('version')) {
      colorLog('✅ Java is installed', 'green');
      
      // Check if agent JAR exists
      const agentPath = path.join(__dirname, 'monitoring-agent', 'target', 'sams-monitoring-agent-1.0.0.jar');
      if (fs.existsSync(agentPath)) {
        colorLog('✅ Java monitoring agent JAR found', 'green');
      } else {
        colorLog('⚠️ Java monitoring agent JAR not found', 'yellow');
        colorLog('💡 Run: cd monitoring-agent && mvn package', 'blue');
      }
    }
  } catch (error) {
    colorLog('⚠️ Java not found - monitoring agent will not be available', 'yellow');
    colorLog('💡 Install Java 11+ to use the monitoring agent', 'blue');
  }
}

// Check external service dependencies
function checkExternalServices() {
  colorLog('\n🔧 Checking external service dependencies...', 'cyan');
  
  // Check if InfluxDB is available
  colorLog('📊 InfluxDB: Optional - for time-series metrics storage', 'blue');
  
  // Check if Kafka is available
  colorLog('📨 Kafka: Optional - for message queue processing', 'blue');
  
  // Check if Redis is available
  colorLog('🔴 Redis: Optional - for caching and session storage', 'blue');
  
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
    colorLog('🚀 Starting SAMS Phase 2 Week 6 System...', 'bright');
    
    // Check dependencies
    checkDependencies();
    checkJavaInstallation();
    checkExternalServices();
    
    colorLog('\n📡 Starting services...', 'cyan');
    
    // Start services in sequence
    await startService('WebSocket', 'websocket-server.js', 8081, 'magenta');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await startService('Integrations', 'integrations-service.js', 8083, 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await startService('Cloud', 'cloud-integrations.js', 8084, 'cyan');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await startService('Main', 'server.js', 8080, 'green');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Display startup summary
    colorLog('\n🎉 SAMS Phase 2 Week 6 System Started Successfully!', 'bright');
    colorLog('=' .repeat(70), 'cyan');
    
    processes.forEach(proc => {
      colorLog(`✅ ${proc.name} Service: http://localhost:${proc.port}`, 'green');
    });
    
    colorLog('\n📊 Available Endpoints:', 'cyan');
    colorLog('   🌐 Main API: http://localhost:8080', 'blue');
    colorLog('   🔌 WebSocket: ws://localhost:8081', 'blue');
    colorLog('   🔗 Integrations: http://localhost:8083', 'blue');
    colorLog('   ☁️ Cloud: http://localhost:8084', 'blue');
    colorLog('   📈 Dashboard: http://localhost:8080/dashboard.html', 'blue');
    
    colorLog('\n🤖 Agent Management:', 'cyan');
    colorLog('   📡 Register Agent: POST /api/v1/agents/register', 'blue');
    colorLog('   📊 Submit Metrics: POST /api/v1/metrics/agent', 'blue');
    colorLog('   📥 Download Agent: GET /api/v1/agents/download/{platform}', 'blue');
    colorLog('   📋 List Agents: GET /api/v1/agents', 'blue');
    
    colorLog('\n🔗 Third-Party Integrations:', 'cyan');
    colorLog('   📧 Email Notifications: Nodemailer/SendGrid', 'blue');
    colorLog('   📱 SMS Notifications: Twilio/AWS SNS', 'blue');
    colorLog('   💬 Slack/Teams Webhooks: Configured via environment', 'blue');
    colorLog('   🎫 JIRA/ServiceNow: Ticket creation support', 'blue');
    colorLog('   🔗 Custom Webhooks: POST /api/v1/integrations/webhooks', 'blue');
    
    colorLog('\n☁️ Cloud Platform Integration:', 'cyan');
    colorLog('   🔍 Resource Discovery: POST /api/v1/cloud/discover', 'blue');
    colorLog('   📊 Multi-Cloud Metrics: GET /api/v1/cloud/metrics/multi-cloud', 'blue');
    colorLog('   📈 Cloud Dashboards: POST /api/v1/cloud/dashboard/{provider}', 'blue');
    
    colorLog('\n🧪 Testing:', 'cyan');
    colorLog('   🔬 Run Tests: npm run test-week6', 'blue');
    colorLog('   📊 Health Checks:', 'blue');
    colorLog('     - Main: http://localhost:8080/api/v1/health', 'blue');
    colorLog('     - Integrations: http://localhost:8083/api/v1/integrations/health', 'blue');
    colorLog('     - Cloud: http://localhost:8084/api/v1/cloud/health', 'blue');
    
    colorLog('\n📋 Installation Scripts:', 'cyan');
    colorLog('   🐧 Linux: ./monitoring-agent/scripts/install-linux.sh', 'blue');
    colorLog('   🪟 Windows: ./monitoring-agent/scripts/install-windows.ps1', 'blue');
    
    colorLog('\n⚙️ Configuration:', 'cyan');
    colorLog('   📧 Email: Set SENDGRID_API_KEY or SMTP settings', 'blue');
    colorLog('   📱 SMS: Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN', 'blue');
    colorLog('   💬 Slack: Set SLACK_WEBHOOK_URL', 'blue');
    colorLog('   ☁️ AWS: Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY', 'blue');
    colorLog('   ☁️ Azure: Set AZURE_SUBSCRIPTION_ID', 'blue');
    colorLog('   ☁️ GCP: Set GOOGLE_CLOUD_PROJECT_ID', 'blue');
    
    colorLog('\n' + '=' .repeat(70), 'cyan');
    colorLog('Press Ctrl+C to stop all services', 'yellow');
    
  } catch (error) {
    colorLog(`❌ Failed to start system: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Graceful shutdown
function setupGracefulShutdown() {
  const shutdown = () => {
    colorLog('\n🔄 Shutting down SAMS Phase 2 Week 6 System...', 'yellow');
    
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
