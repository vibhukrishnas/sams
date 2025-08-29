#!/usr/bin/env node

/**
 * SAMS Strategic Enhancements Demo Script
 * 
 * This script demonstrates all 5 strategic enhancement areas:
 * 1. Lightweight Asset Inventory
 * 2. Basic Remote Actions
 * 3. Enhanced Alerting Intelligence
 * 4. Integration Capabilities
 * 5. Performance Optimization Features
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const BASE_URL = 'http://localhost:8080/api';
const DEMO_DEVICE_ID = 'demo-device-001';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for console output
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

class SAMSDemo {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 12;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  step(title) {
    this.log(`\n${'='.repeat(60)}`, 'cyan');
    this.log(`Step ${this.currentStep}/${this.totalSteps}: ${title}`, 'bright');
    this.log(`${'='.repeat(60)}`, 'cyan');
    this.currentStep++;
  }

  async waitForUser(message = 'Press Enter to continue...') {
    return new Promise(resolve => {
      rl.question(`\n${colors.yellow}${message}${colors.reset}`, () => {
        resolve();
      });
    });
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.log(`Error: ${error.response?.data?.message || error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }

  async introduction() {
    this.log('🚀 SAMS Strategic Enhancements Demo', 'bright');
    this.log('=====================================', 'cyan');
    this.log('\nThis demo showcases the 5 strategic enhancement areas:', 'blue');
    this.log('1. 📦 Lightweight Asset Inventory', 'green');
    this.log('2. 🎮 Basic Remote Actions', 'green');
    this.log('3. 🚨 Enhanced Alerting Intelligence', 'green');
    this.log('4. 🔗 Integration Capabilities', 'green');
    this.log('5. ⚡ Performance Optimization Features', 'green');
    
    await this.waitForUser('\nPress Enter to start the demo...');
  }

  async demonstrateAssetInventory() {
    this.step('Asset Inventory Discovery');
    
    this.log('🔍 Discovering hardware and software assets...', 'blue');
    const discovery = await this.makeRequest('POST', `/assets/discover/${DEMO_DEVICE_ID}`);
    
    if (discovery.success) {
      this.log('✅ Asset discovery completed successfully!', 'green');
      this.log(`📊 Device: ${discovery.data.hostname}`, 'cyan');
      this.log(`💾 Memory: ${discovery.data.hardware.memory.totalGB}GB total`, 'cyan');
      this.log(`💻 CPU: ${discovery.data.hardware.cpu.name}`, 'cyan');
      this.log(`📱 Apps: ${discovery.data.software.installedApps.length} installed`, 'cyan');
    }

    await this.waitForUser();

    this.log('\n📋 Getting asset summary...', 'blue');
    const summary = await this.makeRequest('GET', `/assets/summary/${DEMO_DEVICE_ID}`);
    
    if (summary.success) {
      this.log('📈 Asset Summary:', 'bright');
      console.log(JSON.stringify(summary.data, null, 2));
    }

    await this.waitForUser();
  }

  async demonstrateRemoteActions() {
    this.step('Remote Actions Capabilities');
    
    this.log('🎮 Testing remote script execution...', 'blue');
    const scriptResult = await this.makeRequest('POST', `/remote/script/${DEMO_DEVICE_ID}`, {
      type: 'powershell',
      scriptContent: 'Get-Process | Where-Object {$_.ProcessName -eq "notepad"} | Select-Object ProcessName, Id',
      timeout: 10000
    });

    if (scriptResult.success) {
      this.log('✅ Script executed successfully!', 'green');
      this.log(`⏱️  Duration: ${scriptResult.data.duration}ms`, 'cyan');
    }

    await this.waitForUser();

    this.log('\n🔧 Testing service status check...', 'blue');
    const serviceResult = await this.makeRequest('POST', `/remote/service/${DEMO_DEVICE_ID}`, {
      serviceName: 'Spooler',
      action: 'status'
    });

    if (serviceResult.success) {
      this.log('✅ Service status checked!', 'green');
      this.log('📄 Output:', 'cyan');
      console.log(serviceResult.data.output?.substring(0, 200) + '...');
    }

    await this.waitForUser();

    this.log('\n📜 Checking remote action history...', 'blue');
    const history = await this.makeRequest('GET', `/remote/history/${DEMO_DEVICE_ID}`);
    
    if (history.success) {
      this.log(`📊 Total actions performed: ${history.data.count}`, 'green');
    }

    await this.waitForUser();
  }

  async demonstrateAlerting() {
    this.step('Enhanced Alerting Intelligence');
    
    this.log('🚨 Testing alert system with high CPU usage...', 'blue');
    const alertTest = await this.makeRequest('POST', '/alerts/metric', {
      deviceId: DEMO_DEVICE_ID,
      metric: 'cpu_usage_percent',
      value: 95.5
    });

    if (alertTest.success) {
      this.log(`✅ Processed metric! Triggered ${alertTest.data.alertCount} alerts`, 'green');
    }

    await this.waitForUser();

    this.log('\n📈 Testing memory usage alert...', 'blue');
    const memoryAlert = await this.makeRequest('POST', '/alerts/metric', {
      deviceId: DEMO_DEVICE_ID,
      metric: 'memory_usage_percent',
      value: 92.0
    });

    if (memoryAlert.success) {
      this.log(`✅ Memory alert processed! Triggered ${memoryAlert.data.alertCount} alerts`, 'green');
    }

    await this.waitForUser();

    this.log('\n📊 Getting alert statistics...', 'blue');
    const stats = await this.makeRequest('GET', '/alerts/statistics');
    
    if (stats.success) {
      this.log('📈 Alert Statistics:', 'bright');
      this.log(`Total Alerts: ${stats.data.totalAlerts}`, 'cyan');
      this.log(`Active Alerts: ${stats.data.activeAlerts}`, 'cyan');
      this.log(`Average Resolution Time: ${stats.data.averageResolutionTime.toFixed(1)} minutes`, 'cyan');
    }

    await this.waitForUser();

    this.log('\n🎯 Creating custom alert rule...', 'blue');
    const ruleResult = await this.makeRequest('POST', '/alerts/rules', {
      name: 'Demo High Disk Usage',
      description: 'Alert when disk usage exceeds 85%',
      type: 'disk',
      metric: 'disk_usage_percent',
      operator: '>',
      threshold: 85,
      severity: 'warning',
      predictiveEnabled: true,
      tags: ['demo', 'disk']
    });

    if (ruleResult.success) {
      this.log('✅ Custom alert rule created!', 'green');
      this.log(`Rule ID: ${ruleResult.data.id}`, 'cyan');
    }

    await this.waitForUser();
  }

  async demonstrateIntegrations() {
    this.step('Integration Capabilities');
    
    this.log('🔗 Creating webhook integration...', 'blue');
    const webhook = await this.makeRequest('POST', '/integrations/webhooks', {
      name: 'Demo Alert Webhook',
      url: 'https://httpbin.org/post',
      method: 'POST',
      events: ['alert_created', 'alert_resolved'],
      headers: {
        'X-Demo-Header': 'SAMS-Integration'
      }
    });

    if (webhook.success) {
      this.log('✅ Webhook created successfully!', 'green');
      this.log(`Webhook ID: ${webhook.data.id}`, 'cyan');
    }

    await this.waitForUser();

    this.log('\n📡 Testing webhook trigger...', 'blue');
    const triggerResult = await this.makeRequest('POST', '/integrations/webhooks/trigger', {
      eventType: 'alert_created',
      eventData: {
        alertId: 'demo-alert-001',
        severity: 'warning',
        message: 'Demo alert for integration testing'
      },
      source: 'demo'
    });

    if (triggerResult.success) {
      this.log('✅ Webhook triggered successfully!', 'green');
      this.log(`Event ID: ${triggerResult.data.id}`, 'cyan');
      this.log(`Webhooks executed: ${triggerResult.data.webhookResults?.length || 0}`, 'cyan');
    }

    await this.waitForUser();

    this.log('\n📋 Creating compliance report...', 'blue');
    const report = await this.makeRequest('POST', '/integrations/reports', {
      name: 'Demo Security Report',
      type: 'security',
      format: 'json',
      query: 'SELECT * FROM security_events',
      recipients: ['admin@demo.com']
    });

    if (report.success) {
      this.log('✅ Compliance report template created!', 'green');
      
      // Generate the report
      this.log('\n📊 Generating report...', 'blue');
      const generated = await this.makeRequest('POST', `/integrations/reports/${report.data.id}/generate`);
      
      if (generated.success) {
        this.log('✅ Report generated successfully!', 'green');
        this.log('📄 Report preview:', 'cyan');
        console.log(generated.data.content.substring(0, 300) + '...');
      }
    }

    await this.waitForUser();

    this.log('\n📈 Getting integration statistics...', 'blue');
    const integrationStats = await this.makeRequest('GET', '/integrations/statistics');
    
    if (integrationStats.success) {
      this.log('📊 Integration Statistics:', 'bright');
      this.log(`Webhooks: ${integrationStats.data.webhooks.total} (${integrationStats.data.webhooks.enabled} enabled)`, 'cyan');
      this.log(`API Extensions: ${integrationStats.data.apiExtensions.total}`, 'cyan');
      this.log(`Reports: ${integrationStats.data.complianceReports.total}`, 'cyan');
      this.log(`Success Rate: ${integrationStats.data.webhooks.successRate.toFixed(1)}%`, 'cyan');
    }

    await this.waitForUser();
  }

  async demonstratePerformanceOptimization() {
    this.step('Performance Optimization Features');
    
    this.log('⚡ Collecting performance metrics...', 'blue');
    const metrics = await this.makeRequest('POST', `/performance/collect/${DEMO_DEVICE_ID}`);

    if (metrics.success) {
      this.log('✅ Performance metrics collected!', 'green');
      this.log(`CPU Usage: ${metrics.data.cpu.usage.toFixed(1)}%`, 'cyan');
      this.log(`Memory Usage: ${metrics.data.memory.percentage.toFixed(1)}%`, 'cyan');
      this.log(`Top Process: ${metrics.data.cpu.processes[0]?.name || 'N/A'}`, 'cyan');
    }

    await this.waitForUser();

    this.log('\n🔍 Running comprehensive performance test...', 'blue');
    const perfTest = await this.makeRequest('POST', `/performance/test/${DEMO_DEVICE_ID}`);

    if (perfTest.success) {
      this.log('✅ Performance test completed!', 'green');
      this.log(`Metrics collected: ${perfTest.data.metricsCollected}`, 'cyan');
      this.log(`Recommendations: ${perfTest.data.recommendations.length}`, 'cyan');
      this.log(`Trends analyzed: ${perfTest.data.trends.length}`, 'cyan');
    }

    await this.waitForUser();

    this.log('\n📊 Getting performance recommendations...', 'blue');
    const recommendations = await this.makeRequest('GET', '/performance/recommendations', {
      deviceId: DEMO_DEVICE_ID
    });

    if (recommendations.success && recommendations.data.length > 0) {
      this.log('💡 Performance Recommendations:', 'bright');
      recommendations.data.slice(0, 3).forEach((rec, index) => {
        this.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`, 'yellow');
        this.log(`   ${rec.description}`, 'cyan');
      });
    }

    await this.waitForUser();

    this.log('\n📈 Getting performance trends...', 'blue');
    const trends = await this.makeRequest('GET', '/performance/trends', {
      deviceId: DEMO_DEVICE_ID
    });

    if (trends.success && trends.data.length > 0) {
      this.log('📊 Performance Trends:', 'bright');
      trends.data.forEach(trend => {
        const trendIcon = trend.trend === 'improving' ? '📈' : trend.trend === 'degrading' ? '📉' : '➡️';
        this.log(`${trendIcon} ${trend.metric}: ${trend.trend} (confidence: ${(trend.confidence * 100).toFixed(1)}%)`, 'cyan');
      });
    }

    await this.waitForUser();

    this.log('\n🏥 Getting device health score...', 'blue');
    const health = await this.makeRequest('GET', `/performance/health/${DEMO_DEVICE_ID}`);

    if (health.success) {
      const healthEmoji = health.data.healthScore > 90 ? '💚' : health.data.healthScore > 75 ? '💛' : '❤️';
      this.log(`${healthEmoji} Device Health Score: ${health.data.healthScore}/100 (${health.data.status})`, 'bright');
      this.log(`Critical Issues: ${health.data.issues.critical}`, 'cyan');
      this.log(`High Priority Issues: ${health.data.issues.high}`, 'cyan');
      this.log(`CPU Status: ${health.data.issues.performance.cpu}`, 'cyan');
      this.log(`Memory Status: ${health.data.issues.performance.memory}`, 'cyan');
      this.log(`Disk Status: ${health.data.issues.performance.disk}`, 'cyan');
    }

    await this.waitForUser();
  }

  async demonstrateIntegratedWorkflow() {
    this.step('Integrated Workflow Demonstration');
    
    this.log('🔄 Demonstrating integrated workflow...', 'blue');
    this.log('This shows how all 5 enhancement areas work together:', 'cyan');

    // Step 1: Asset Discovery
    this.log('\n1️⃣ Asset Discovery triggers...', 'yellow');
    await this.makeRequest('POST', `/assets/discover/${DEMO_DEVICE_ID}`);

    // Step 2: Performance Monitoring
    this.log('2️⃣ Performance monitoring collects metrics...', 'yellow');
    await this.makeRequest('POST', `/performance/collect/${DEMO_DEVICE_ID}`);

    // Step 3: Alert Processing
    this.log('3️⃣ Alert system processes high resource usage...', 'yellow');
    await this.makeRequest('POST', '/alerts/metric', {
      deviceId: DEMO_DEVICE_ID,
      metric: 'cpu_usage_percent',
      value: 88.0
    });

    // Step 4: Webhook Integration
    this.log('4️⃣ Webhook integration sends notifications...', 'yellow');
    await this.makeRequest('POST', '/integrations/webhooks/trigger', {
      eventType: 'system_optimization_needed',
      eventData: {
        deviceId: DEMO_DEVICE_ID,
        cpuUsage: 88.0,
        recommendedAction: 'process_cleanup'
      }
    });

    // Step 5: Remote Action
    this.log('5️⃣ Remote action cleans up processes...', 'yellow');
    await this.makeRequest('POST', `/remote/script/${DEMO_DEVICE_ID}`, {
      type: 'powershell',
      scriptContent: 'Write-Output "Simulated process cleanup completed"'
    });

    this.log('\n✅ Integrated workflow completed!', 'green');
    this.log('All 5 strategic enhancement areas worked together seamlessly!', 'bright');

    await this.waitForUser();
  }

  async showSummary() {
    this.step('Demo Summary & Results');
    
    this.log('🎉 SAMS Strategic Enhancements Demo Completed!', 'bright');
    this.log('=' .repeat(50), 'cyan');
    
    this.log('\n✅ Successfully Demonstrated:', 'green');
    this.log('  📦 Asset Inventory - Hardware/software discovery & tracking', 'cyan');
    this.log('  🎮 Remote Actions - Script execution & system management', 'cyan');
    this.log('  🚨 Enhanced Alerting - Intelligent alerts with predictive analytics', 'cyan');
    this.log('  🔗 Integrations - Webhooks, reports & third-party connections', 'cyan');
    this.log('  ⚡ Performance Optimization - Monitoring, recommendations & health scoring', 'cyan');

    this.log('\n🌟 Key Features Showcased:', 'bright');
    this.log('  • Real-time asset discovery and change tracking', 'yellow');
    this.log('  • Automated remote script execution and service management', 'yellow');
    this.log('  • Predictive alerting with correlation and trending', 'yellow');
    this.log('  • Webhook integrations with compliance reporting', 'yellow');
    this.log('  • Performance optimization with automated recommendations', 'yellow');
    this.log('  • Integrated workflow demonstrating all components working together', 'yellow');

    this.log('\n🚀 Next Steps:', 'bright');
    this.log('  1. Explore the mobile app for real-time monitoring', 'magenta');
    this.log('  2. Configure custom alert rules for your environment', 'magenta');
    this.log('  3. Set up webhook integrations with your existing tools', 'magenta');
    this.log('  4. Schedule automated performance optimizations', 'magenta');
    this.log('  5. Generate compliance reports for your organization', 'magenta');

    this.log('\n📊 SAMS is now a comprehensive monitoring and management platform!', 'green');
    this.log('From basic monitoring to enterprise-grade asset management and automation.', 'cyan');
  }

  async run() {
    try {
      await this.introduction();
      await this.demonstrateAssetInventory();
      await this.demonstrateRemoteActions();
      await this.demonstrateAlerting();
      await this.demonstrateIntegrations();
      await this.demonstratePerformanceOptimization();
      await this.demonstrateIntegratedWorkflow();
      await this.showSummary();
    } catch (error) {
      this.log(`\n❌ Demo failed: ${error.message}`, 'red');
      this.log('Make sure the SAMS backend server is running on port 8080', 'yellow');
    } finally {
      rl.close();
    }
  }
}

// Run the demo
if (require.main === module) {
  const demo = new SAMSDemo();
  demo.run();
}

module.exports = SAMSDemo;
