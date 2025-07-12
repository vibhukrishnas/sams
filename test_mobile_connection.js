#!/usr/bin/env node
/**
 * 🔧 Mobile Connection Test Script
 * Tests if the mobile app can connect to the SAMS server
 */

const fetch = require('node-fetch');

class ConnectionTester {
  constructor() {
    this.endpoints = [
      'http://10.0.2.2:8080',      // Android emulator host
      'http://192.168.1.7:8080',   // Direct IP
      'http://localhost:8080',     // Localhost
      'http://127.0.0.1:8080',     // Loopback
    ];
  }

  async testEndpoint(endpoint) {
    try {
      console.log(`🔍 Testing: ${endpoint}`);
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const fetchPromise = fetch(`${endpoint}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${endpoint}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Hostname: ${data.hostname}`);
        return { success: true, endpoint, data };
      } else {
        console.log(`❌ FAILED: ${endpoint} - HTTP ${response.status}`);
        return { success: false, endpoint, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.log(`❌ FAILED: ${endpoint} - ${error.message}`);
      return { success: false, endpoint, error: error.message };
    }
  }

  async testAllEndpoints() {
    console.log('🚀 Testing Mobile App Connection to SAMS Server');
    console.log('================================================');
    
    const results = [];
    
    for (const endpoint of this.endpoints) {
      const result = await this.testEndpoint(endpoint);
      results.push(result);
      console.log('');
    }
    
    console.log('📊 SUMMARY:');
    console.log('===========');
    
    const working = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (working.length > 0) {
      console.log(`✅ Working endpoints: ${working.length}`);
      working.forEach(r => console.log(`   - ${r.endpoint}`));
      
      console.log('');
      console.log('🎯 RECOMMENDATION:');
      console.log(`Use this endpoint in your mobile app: ${working[0].endpoint}`);
      
    } else {
      console.log('❌ No working endpoints found!');
      console.log('');
      console.log('🔧 TROUBLESHOOTING:');
      console.log('1. Ensure SAMS server is running');
      console.log('2. Check Windows Firewall settings');
      console.log('3. Verify network connectivity');
      console.log('4. Try running server with: python windows_sams_server.py');
    }
    
    console.log('');
    console.log('📱 For Android Emulator:');
    console.log('- Use 10.0.2.2:8080 (special emulator IP)');
    console.log('- Or use adb port forwarding: adb reverse tcp:8080 tcp:8080');
    
    console.log('');
    console.log('📱 For Physical Device:');
    console.log('- Use your computer\'s IP address (192.168.1.7:8080)');
    console.log('- Ensure both devices are on same network');
    
    return working.length > 0;
  }

  async testServerAddition() {
    console.log('');
    console.log('🔧 Testing Server Addition API');
    console.log('==============================');
    
    // Find working endpoint first
    const workingEndpoint = this.endpoints[1]; // Use direct IP for testing
    
    try {
      const response = await fetch(`${workingEndpoint}/api/v1/servers/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Server',
          ip: '192.168.1.7',
          type: 'Windows',
          port: 8080
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Server addition API working');
        console.log(`   Success: ${result.success}`);
        console.log(`   Message: ${result.message}`);
        return true;
      } else {
        console.log(`❌ Server addition failed: HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Server addition error: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  const tester = new ConnectionTester();
  
  const connectionWorking = await tester.testAllEndpoints();
  
  if (connectionWorking) {
    await tester.testServerAddition();
  }
  
  process.exit(connectionWorking ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ConnectionTester;
