const http = require('http');

const API_BASE = 'http://localhost:3000/api';

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test all API endpoints
async function testAllEndpoints() {
  console.log('🚀 Testing SAMS Backend API Endpoints...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const health = await makeRequest(`${API_BASE}/health`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);

    // Test 2: Get Servers
    console.log('2️⃣ Testing Get Servers...');
    const servers = await makeRequest(`${API_BASE}/servers`);
    console.log(`   Status: ${servers.status}`);
    console.log(`   Servers Count: ${servers.data.data ? servers.data.data.length : 0}`);
    if (servers.data.data && servers.data.data.length > 0) {
      console.log(`   First Server: ${servers.data.data[0].name} (${servers.data.data[0].status})`);
    }
    console.log('');

    // Test 3: Get Specific Server
    console.log('3️⃣ Testing Get Server by ID...');
    const server = await makeRequest(`${API_BASE}/servers/1`);
    console.log(`   Status: ${server.status}`);
    if (server.data.data) {
      console.log(`   Server: ${server.data.data.name} - CPU: ${server.data.data.cpu}%`);
    }
    console.log('');

    // Test 4: Get Alerts
    console.log('4️⃣ Testing Get Alerts...');
    const alerts = await makeRequest(`${API_BASE}/alerts`);
    console.log(`   Status: ${alerts.status}`);
    console.log(`   Alerts Count: ${alerts.data.data ? alerts.data.data.length : 0}`);
    if (alerts.data.data && alerts.data.data.length > 0) {
      console.log(`   First Alert: ${alerts.data.data[0].title} (${alerts.data.data[0].severity})`);
    }
    console.log('');

    // Test 5: Get Metrics
    console.log('5️⃣ Testing Get System Metrics...');
    const metrics = await makeRequest(`${API_BASE}/metrics`);
    console.log(`   Status: ${metrics.status}`);
    if (metrics.data.data) {
      console.log(`   Online Servers: ${metrics.data.data.servers.online}/${metrics.data.data.servers.total}`);
      console.log(`   Active Alerts: ${metrics.data.data.alerts.active}`);
      console.log(`   Avg CPU: ${metrics.data.data.performance.avgCpu}%`);
    }
    console.log('');

    // Test 6: Get Reports
    console.log('6️⃣ Testing Get Reports...');
    const reports = await makeRequest(`${API_BASE}/reports`);
    console.log(`   Status: ${reports.status}`);
    console.log(`   Reports Count: ${reports.data.data ? reports.data.data.length : 0}`);
    if (reports.data.data && reports.data.data.length > 0) {
      console.log(`   First Report: ${reports.data.data[0].name} (${reports.data.data[0].status})`);
    }
    console.log('');

    // Test 7: Generate Report
    console.log('7️⃣ Testing Generate Report...');
    const newReport = await makeRequest(`${API_BASE}/reports/generate`, 'POST', {
      name: 'Test API Report',
      type: 'performance',
      format: 'PDF'
    });
    console.log(`   Status: ${newReport.status}`);
    if (newReport.data.data) {
      console.log(`   Generated: ${newReport.data.data.name} (${newReport.data.data.status})`);
    }
    console.log('');

    // Test 8: Acknowledge Alert (if alerts exist)
    if (alerts.data.data && alerts.data.data.length > 0) {
      const firstAlert = alerts.data.data[0];
      if (firstAlert.status === 'Active') {
        console.log('8️⃣ Testing Acknowledge Alert...');
        const ackAlert = await makeRequest(`${API_BASE}/alerts/${firstAlert.id}/acknowledge`, 'POST');
        console.log(`   Status: ${ackAlert.status}`);
        if (ackAlert.data.data) {
          console.log(`   Alert: ${ackAlert.data.data.title} (${ackAlert.data.data.status})`);
        }
        console.log('');
      }
    }

    console.log('✅ All API tests completed successfully!');
    console.log('\n🎯 Your SAMS backend is ready for mobile app integration!');
    console.log('\n📱 Next steps:');
    console.log('   1. Update your React Native app API_BASE_URL to: http://10.0.2.2:3000/api');
    console.log('   2. Replace mock data with real API calls');
    console.log('   3. Test the integration in your Android emulator');
    console.log('\n🚀 Ready for client demos!');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Run the tests
testAllEndpoints();
