const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const fs = require('fs');

/**
 * SAMS Performance Load Testing Suite
 * Tests system performance under various load conditions
 */

class LoadTester {
    constructor(config) {
        this.config = {
            baseUrl: 'http://localhost:8080',
            maxConcurrentUsers: 1000,
            testDuration: 300, // 5 minutes
            rampUpTime: 60, // 1 minute
            endpoints: [
                { path: '/api/v1/servers', method: 'GET', weight: 40 },
                { path: '/api/v1/alerts', method: 'GET', weight: 30 },
                { path: '/api/v1/metrics', method: 'POST', weight: 20 },
                { path: '/api/v1/auth/refresh', method: 'POST', weight: 10 }
            ],
            ...config
        };
        
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: [],
            throughput: 0,
            startTime: null,
            endTime: null
        };
        
        this.activeUsers = 0;
        this.running = false;
    }

    async start() {
        console.log('🚀 Starting SAMS Load Test');
        console.log(`Target: ${this.config.baseUrl}`);
        console.log(`Max Users: ${this.config.maxConcurrentUsers}`);
        console.log(`Duration: ${this.config.testDuration}s`);
        console.log(`Ramp-up: ${this.config.rampUpTime}s`);
        
        this.results.startTime = performance.now();
        this.running = true;
        
        // Start ramp-up
        await this.rampUp();
        
        // Run steady state
        await this.steadyState();
        
        // Ramp down
        await this.rampDown();
        
        this.results.endTime = performance.now();
        
        // Generate report
        this.generateReport();
    }

    async rampUp() {
        console.log('📈 Ramping up users...');
        const usersPerSecond = this.config.maxConcurrentUsers / this.config.rampUpTime;
        
        for (let i = 0; i < this.config.rampUpTime && this.running; i++) {
            const usersToAdd = Math.floor(usersPerSecond);
            
            for (let j = 0; j < usersToAdd; j++) {
                this.startVirtualUser();
            }
            
            await this.sleep(1000);
            console.log(`Active users: ${this.activeUsers}`);
        }
    }

    async steadyState() {
        console.log('⚡ Running steady state test...');
        const steadyDuration = this.config.testDuration - this.config.rampUpTime - 30; // 30s ramp down
        
        await this.sleep(steadyDuration * 1000);
    }

    async rampDown() {
        console.log('📉 Ramping down users...');
        this.running = false;
        
        // Wait for active requests to complete
        while (this.activeUsers > 0) {
            await this.sleep(1000);
            console.log(`Waiting for ${this.activeUsers} users to complete...`);
        }
    }

    startVirtualUser() {
        this.activeUsers++;
        
        const userLoop = async () => {
            while (this.running) {
                try {
                    const endpoint = this.selectEndpoint();
                    const startTime = performance.now();
                    
                    await this.makeRequest(endpoint);
                    
                    const endTime = performance.now();
                    const responseTime = endTime - startTime;
                    
                    this.results.totalRequests++;
                    this.results.successfulRequests++;
                    this.results.responseTimes.push(responseTime);
                    
                    // Think time between requests (1-3 seconds)
                    const thinkTime = Math.random() * 2000 + 1000;
                    await this.sleep(thinkTime);
                    
                } catch (error) {
                    this.results.totalRequests++;
                    this.results.failedRequests++;
                    this.results.errors.push({
                        timestamp: new Date().toISOString(),
                        error: error.message
                    });
                }
            }
            
            this.activeUsers--;
        };
        
        userLoop();
    }

    selectEndpoint() {
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (const endpoint of this.config.endpoints) {
            cumulative += endpoint.weight;
            if (random <= cumulative) {
                return endpoint;
            }
        }
        
        return this.config.endpoints[0];
    }

    makeRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint.path, this.config.baseUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SAMS-LoadTester/1.0'
                }
            };
            
            // Add auth header if available
            if (this.config.authToken) {
                options.headers['Authorization'] = `Bearer ${this.config.authToken}`;
            }
            
            const req = httpModule.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            // Send request body for POST requests
            if (endpoint.method === 'POST') {
                const body = this.generateRequestBody(endpoint.path);
                req.write(JSON.stringify(body));
            }
            
            req.end();
        });
    }

    generateRequestBody(path) {
        if (path.includes('/metrics')) {
            return {
                agentId: 'load-test-agent',
                timestamp: new Date().toISOString(),
                hostname: 'load-test-host',
                metrics: {
                    cpu: { usage: Math.random() * 100 },
                    memory: { usage: Math.random() * 100 },
                    disk: { usage: Math.random() * 100 }
                }
            };
        } else if (path.includes('/auth/refresh')) {
            return {
                refreshToken: 'mock-refresh-token'
            };
        }
        
        return {};
    }

    generateReport() {
        const duration = (this.results.endTime - this.results.startTime) / 1000;
        const throughput = this.results.totalRequests / duration;
        
        // Calculate percentiles
        const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
        const percentiles = {
            p50: this.getPercentile(sortedTimes, 50),
            p90: this.getPercentile(sortedTimes, 90),
            p95: this.getPercentile(sortedTimes, 95),
            p99: this.getPercentile(sortedTimes, 99)
        };
        
        const avgResponseTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
        const errorRate = (this.results.failedRequests / this.results.totalRequests) * 100;
        
        const report = {
            summary: {
                testDuration: duration,
                totalRequests: this.results.totalRequests,
                successfulRequests: this.results.successfulRequests,
                failedRequests: this.results.failedRequests,
                errorRate: errorRate.toFixed(2) + '%',
                throughput: throughput.toFixed(2) + ' req/s'
            },
            performance: {
                averageResponseTime: avgResponseTime.toFixed(2) + 'ms',
                percentiles: {
                    '50th': percentiles.p50.toFixed(2) + 'ms',
                    '90th': percentiles.p90.toFixed(2) + 'ms',
                    '95th': percentiles.p95.toFixed(2) + 'ms',
                    '99th': percentiles.p99.toFixed(2) + 'ms'
                }
            },
            errors: this.results.errors.slice(0, 10), // First 10 errors
            timestamp: new Date().toISOString()
        };
        
        console.log('\n📊 Load Test Results:');
        console.log('===================');
        console.log(`Duration: ${duration.toFixed(2)}s`);
        console.log(`Total Requests: ${this.results.totalRequests}`);
        console.log(`Successful: ${this.results.successfulRequests}`);
        console.log(`Failed: ${this.results.failedRequests}`);
        console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
        console.log(`Throughput: ${throughput.toFixed(2)} req/s`);
        console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`95th Percentile: ${percentiles.p95.toFixed(2)}ms`);
        
        // Save detailed report
        const reportFile = `load-test-report-${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved: ${reportFile}`);
        
        // Performance assertions
        this.assertPerformance(report);
    }

    getPercentile(sortedArray, percentile) {
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[index] || 0;
    }

    assertPerformance(report) {
        console.log('\n✅ Performance Assertions:');
        
        const assertions = [
            {
                name: 'Error Rate < 1%',
                condition: parseFloat(report.summary.errorRate) < 1,
                actual: report.summary.errorRate
            },
            {
                name: 'Avg Response Time < 2000ms',
                condition: parseFloat(report.performance.averageResponseTime) < 2000,
                actual: report.performance.averageResponseTime
            },
            {
                name: '95th Percentile < 5000ms',
                condition: parseFloat(report.performance.percentiles['95th']) < 5000,
                actual: report.performance.percentiles['95th']
            },
            {
                name: 'Throughput > 100 req/s',
                condition: parseFloat(report.summary.throughput) > 100,
                actual: report.summary.throughput
            }
        ];
        
        let passed = 0;
        assertions.forEach(assertion => {
            const status = assertion.condition ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${assertion.name}: ${assertion.actual}`);
            if (assertion.condition) passed++;
        });
        
        console.log(`\n📈 Performance Score: ${passed}/${assertions.length} assertions passed`);
        
        if (passed === assertions.length) {
            console.log('🎉 All performance requirements met!');
        } else {
            console.log('⚠️  Some performance requirements not met');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI execution
if (require.main === module) {
    const config = {
        baseUrl: process.env.SAMS_URL || 'http://localhost:8080',
        maxConcurrentUsers: parseInt(process.env.MAX_USERS) || 100,
        testDuration: parseInt(process.env.TEST_DURATION) || 60,
        rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 20,
        authToken: process.env.AUTH_TOKEN
    };
    
    const tester = new LoadTester(config);
    
    process.on('SIGINT', () => {
        console.log('\n🛑 Test interrupted by user');
        tester.running = false;
    });
    
    tester.start().catch(console.error);
}

module.exports = LoadTester;
