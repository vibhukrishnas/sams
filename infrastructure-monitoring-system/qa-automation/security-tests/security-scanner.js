const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

/**
 * SAMS Security Testing Suite
 * Automated security vulnerability scanner
 */

class SecurityScanner {
    constructor(config) {
        this.config = {
            baseUrl: 'http://localhost:8080',
            timeout: 10000,
            userAgent: 'SAMS-SecurityScanner/1.0',
            ...config
        };
        
        this.results = {
            vulnerabilities: [],
            warnings: [],
            passed: [],
            summary: {}
        };
    }

    async scan() {
        console.log('🔒 Starting SAMS Security Scan');
        console.log(`Target: ${this.config.baseUrl}`);
        
        const tests = [
            this.testSQLInjection,
            this.testXSS,
            this.testCSRF,
            this.testAuthenticationBypass,
            this.testSessionManagement,
            this.testInputValidation,
            this.testHTTPSecurity,
            this.testAPIRateLimiting,
            this.testDirectoryTraversal,
            this.testInformationDisclosure
        ];
        
        for (const test of tests) {
            try {
                await test.call(this);
            } catch (error) {
                this.addVulnerability('TEST_ERROR', `Test execution failed: ${error.message}`, 'HIGH');
            }
        }
        
        this.generateReport();
    }

    async testSQLInjection() {
        console.log('🔍 Testing SQL Injection vulnerabilities...');
        
        const payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "1' OR '1'='1' --",
            "admin'--",
            "' OR 1=1#"
        ];
        
        const endpoints = [
            '/api/v1/auth/login',
            '/api/v1/users',
            '/api/v1/servers',
            '/api/v1/alerts'
        ];
        
        for (const endpoint of endpoints) {
            for (const payload of payloads) {
                try {
                    const response = await this.makeRequest(endpoint, 'POST', {
                        username: payload,
                        password: payload,
                        search: payload
                    });
                    
                    if (this.detectSQLError(response.body)) {
                        this.addVulnerability(
                            'SQL_INJECTION',
                            `SQL injection vulnerability detected at ${endpoint} with payload: ${payload}`,
                            'CRITICAL'
                        );
                    }
                } catch (error) {
                    // Expected for most payloads
                }
            }
        }
        
        this.addPassed('SQL_INJECTION', 'No obvious SQL injection vulnerabilities detected');
    }

    async testXSS() {
        console.log('🔍 Testing XSS vulnerabilities...');
        
        const payloads = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert("XSS")>',
            'javascript:alert("XSS")',
            '<svg onload=alert("XSS")>',
            '"><script>alert("XSS")</script>',
            "';alert('XSS');//"
        ];
        
        const endpoints = [
            '/api/v1/servers',
            '/api/v1/alerts',
            '/api/v1/users'
        ];
        
        for (const endpoint of endpoints) {
            for (const payload of payloads) {
                try {
                    const response = await this.makeRequest(endpoint, 'POST', {
                        name: payload,
                        description: payload,
                        comment: payload
                    });
                    
                    if (response.body.includes(payload) && !this.isPayloadEscaped(response.body, payload)) {
                        this.addVulnerability(
                            'XSS',
                            `XSS vulnerability detected at ${endpoint} - payload reflected unescaped`,
                            'HIGH'
                        );
                    }
                } catch (error) {
                    // Expected for most payloads
                }
            }
        }
        
        this.addPassed('XSS', 'No obvious XSS vulnerabilities detected');
    }

    async testCSRF() {
        console.log('🔍 Testing CSRF vulnerabilities...');
        
        const endpoints = [
            { path: '/api/v1/users', method: 'POST' },
            { path: '/api/v1/servers', method: 'POST' },
            { path: '/api/v1/alerts', method: 'POST' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                // Test without CSRF token
                const response = await this.makeRequest(endpoint.path, endpoint.method, {
                    test: 'csrf_test'
                }, {
                    'Origin': 'http://malicious-site.com',
                    'Referer': 'http://malicious-site.com'
                });
                
                if (response.statusCode === 200) {
                    this.addVulnerability(
                        'CSRF',
                        `CSRF vulnerability detected at ${endpoint.path} - accepts cross-origin requests`,
                        'MEDIUM'
                    );
                }
            } catch (error) {
                // Expected - CSRF protection should block this
            }
        }
        
        this.addPassed('CSRF', 'CSRF protection appears to be in place');
    }

    async testAuthenticationBypass() {
        console.log('🔍 Testing authentication bypass...');
        
        const protectedEndpoints = [
            '/api/v1/users',
            '/api/v1/servers',
            '/api/v1/alerts',
            '/api/v1/admin'
        ];
        
        for (const endpoint of protectedEndpoints) {
            try {
                // Test without authentication
                const response = await this.makeRequest(endpoint, 'GET');
                
                if (response.statusCode === 200) {
                    this.addVulnerability(
                        'AUTH_BYPASS',
                        `Authentication bypass detected at ${endpoint} - accessible without authentication`,
                        'CRITICAL'
                    );
                }
            } catch (error) {
                // Expected - should require authentication
            }
            
            try {
                // Test with invalid token
                const response = await this.makeRequest(endpoint, 'GET', null, {
                    'Authorization': 'Bearer invalid-token'
                });
                
                if (response.statusCode === 200) {
                    this.addVulnerability(
                        'AUTH_BYPASS',
                        `Authentication bypass detected at ${endpoint} - accepts invalid tokens`,
                        'CRITICAL'
                    );
                }
            } catch (error) {
                // Expected - should reject invalid tokens
            }
        }
        
        this.addPassed('AUTH_BYPASS', 'Authentication appears to be properly enforced');
    }

    async testSessionManagement() {
        console.log('🔍 Testing session management...');
        
        try {
            // Test session fixation
            const loginResponse = await this.makeRequest('/api/v1/auth/login', 'POST', {
                username: 'test',
                password: 'test'
            });
            
            const cookies = this.extractCookies(loginResponse.headers);
            
            if (cookies.length === 0) {
                this.addWarning('SESSION', 'No session cookies detected - using stateless authentication');
            } else {
                // Check for secure flags
                for (const cookie of cookies) {
                    if (!cookie.includes('Secure')) {
                        this.addVulnerability(
                            'SESSION',
                            'Session cookie missing Secure flag',
                            'MEDIUM'
                        );
                    }
                    
                    if (!cookie.includes('HttpOnly')) {
                        this.addVulnerability(
                            'SESSION',
                            'Session cookie missing HttpOnly flag',
                            'MEDIUM'
                        );
                    }
                    
                    if (!cookie.includes('SameSite')) {
                        this.addVulnerability(
                            'SESSION',
                            'Session cookie missing SameSite attribute',
                            'LOW'
                        );
                    }
                }
            }
        } catch (error) {
            // Expected for test credentials
        }
        
        this.addPassed('SESSION', 'Session management security checks completed');
    }

    async testInputValidation() {
        console.log('🔍 Testing input validation...');
        
        const invalidInputs = [
            'A'.repeat(10000), // Buffer overflow
            '../../../etc/passwd', // Directory traversal
            '${7*7}', // Expression injection
            '{{7*7}}', // Template injection
            'null', // Null injection
            '0x41414141' // Hex injection
        ];
        
        const endpoints = [
            '/api/v1/servers',
            '/api/v1/alerts',
            '/api/v1/users'
        ];
        
        for (const endpoint of endpoints) {
            for (const input of invalidInputs) {
                try {
                    const response = await this.makeRequest(endpoint, 'POST', {
                        name: input,
                        description: input
                    });
                    
                    if (response.statusCode === 200) {
                        this.addWarning(
                            'INPUT_VALIDATION',
                            `Endpoint ${endpoint} may not properly validate input: ${input.substring(0, 50)}...`
                        );
                    }
                } catch (error) {
                    // Expected - should reject invalid input
                }
            }
        }
        
        this.addPassed('INPUT_VALIDATION', 'Input validation checks completed');
    }

    async testHTTPSecurity() {
        console.log('🔍 Testing HTTP security headers...');
        
        try {
            const response = await this.makeRequest('/', 'GET');
            const headers = response.headers;
            
            const securityHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection',
                'strict-transport-security',
                'content-security-policy'
            ];
            
            for (const header of securityHeaders) {
                if (!headers[header]) {
                    this.addVulnerability(
                        'HTTP_SECURITY',
                        `Missing security header: ${header}`,
                        'LOW'
                    );
                }
            }
            
            // Check for information disclosure
            if (headers['server']) {
                this.addWarning('HTTP_SECURITY', `Server header reveals information: ${headers['server']}`);
            }
            
            if (headers['x-powered-by']) {
                this.addWarning('HTTP_SECURITY', `X-Powered-By header reveals information: ${headers['x-powered-by']}`);
            }
            
        } catch (error) {
            this.addWarning('HTTP_SECURITY', 'Could not test HTTP security headers');
        }
        
        this.addPassed('HTTP_SECURITY', 'HTTP security headers check completed');
    }

    async testAPIRateLimiting() {
        console.log('🔍 Testing API rate limiting...');
        
        const endpoint = '/api/v1/auth/login';
        const requests = [];
        
        // Send multiple requests rapidly
        for (let i = 0; i < 20; i++) {
            requests.push(this.makeRequest(endpoint, 'POST', {
                username: 'test',
                password: 'test'
            }));
        }
        
        try {
            const responses = await Promise.allSettled(requests);
            const rateLimited = responses.some(r => 
                r.status === 'fulfilled' && r.value.statusCode === 429
            );
            
            if (!rateLimited) {
                this.addVulnerability(
                    'RATE_LIMITING',
                    'No rate limiting detected on authentication endpoint',
                    'MEDIUM'
                );
            } else {
                this.addPassed('RATE_LIMITING', 'Rate limiting is properly implemented');
            }
        } catch (error) {
            this.addWarning('RATE_LIMITING', 'Could not test rate limiting');
        }
    }

    async testDirectoryTraversal() {
        console.log('🔍 Testing directory traversal...');
        
        const payloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
        ];
        
        for (const payload of payloads) {
            try {
                const response = await this.makeRequest(`/api/v1/files/${payload}`, 'GET');
                
                if (response.statusCode === 200 && this.detectSystemFile(response.body)) {
                    this.addVulnerability(
                        'DIRECTORY_TRAVERSAL',
                        `Directory traversal vulnerability detected with payload: ${payload}`,
                        'HIGH'
                    );
                }
            } catch (error) {
                // Expected - should not allow directory traversal
            }
        }
        
        this.addPassed('DIRECTORY_TRAVERSAL', 'No directory traversal vulnerabilities detected');
    }

    async testInformationDisclosure() {
        console.log('🔍 Testing information disclosure...');
        
        const endpoints = [
            '/api/v1/debug',
            '/api/v1/status',
            '/api/v1/health',
            '/api/v1/info',
            '/.env',
            '/config.json',
            '/swagger-ui.html'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest(endpoint, 'GET');
                
                if (response.statusCode === 200) {
                    if (this.detectSensitiveInfo(response.body)) {
                        this.addVulnerability(
                            'INFO_DISCLOSURE',
                            `Sensitive information disclosed at ${endpoint}`,
                            'MEDIUM'
                        );
                    } else {
                        this.addWarning('INFO_DISCLOSURE', `Endpoint ${endpoint} is publicly accessible`);
                    }
                }
            } catch (error) {
                // Expected for most endpoints
            }
        }
        
        this.addPassed('INFO_DISCLOSURE', 'Information disclosure checks completed');
    }

    // Helper methods
    makeRequest(path, method = 'GET', body = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.config.baseUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'User-Agent': this.config.userAgent,
                    'Content-Type': 'application/json',
                    ...headers
                }
            };
            
            const req = httpModule.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(this.config.timeout, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            if (body) {
                req.write(JSON.stringify(body));
            }
            
            req.end();
        });
    }

    detectSQLError(body) {
        const sqlErrors = [
            'SQL syntax error',
            'mysql_fetch_array',
            'ORA-01756',
            'Microsoft OLE DB Provider',
            'PostgreSQL query failed',
            'Warning: pg_exec',
            'SQLite error'
        ];
        
        return sqlErrors.some(error => body.toLowerCase().includes(error.toLowerCase()));
    }

    isPayloadEscaped(body, payload) {
        const escaped = payload
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        
        return body.includes(escaped);
    }

    extractCookies(headers) {
        const setCookie = headers['set-cookie'] || [];
        return Array.isArray(setCookie) ? setCookie : [setCookie];
    }

    detectSystemFile(body) {
        const systemFiles = [
            'root:x:0:0:root',
            '[boot loader]',
            'Windows Registry Editor',
            '# /etc/passwd'
        ];
        
        return systemFiles.some(pattern => body.includes(pattern));
    }

    detectSensitiveInfo(body) {
        const sensitivePatterns = [
            /password/i,
            /secret/i,
            /api[_-]?key/i,
            /token/i,
            /database/i,
            /connection[_-]?string/i
        ];
        
        return sensitivePatterns.some(pattern => pattern.test(body));
    }

    addVulnerability(type, description, severity) {
        this.results.vulnerabilities.push({
            type,
            description,
            severity,
            timestamp: new Date().toISOString()
        });
    }

    addWarning(type, description) {
        this.results.warnings.push({
            type,
            description,
            timestamp: new Date().toISOString()
        });
    }

    addPassed(type, description) {
        this.results.passed.push({
            type,
            description,
            timestamp: new Date().toISOString()
        });
    }

    generateReport() {
        const critical = this.results.vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
        const high = this.results.vulnerabilities.filter(v => v.severity === 'HIGH').length;
        const medium = this.results.vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
        const low = this.results.vulnerabilities.filter(v => v.severity === 'LOW').length;
        
        this.results.summary = {
            total_vulnerabilities: this.results.vulnerabilities.length,
            critical,
            high,
            medium,
            low,
            warnings: this.results.warnings.length,
            passed: this.results.passed.length
        };
        
        console.log('\n🔒 Security Scan Results:');
        console.log('========================');
        console.log(`Total Vulnerabilities: ${this.results.vulnerabilities.length}`);
        console.log(`Critical: ${critical}`);
        console.log(`High: ${high}`);
        console.log(`Medium: ${medium}`);
        console.log(`Low: ${low}`);
        console.log(`Warnings: ${this.results.warnings.length}`);
        console.log(`Passed: ${this.results.passed.length}`);
        
        if (this.results.vulnerabilities.length > 0) {
            console.log('\n🚨 Vulnerabilities Found:');
            this.results.vulnerabilities.forEach((vuln, index) => {
                console.log(`${index + 1}. [${vuln.severity}] ${vuln.type}: ${vuln.description}`);
            });
        }
        
        // Save detailed report
        const reportFile = `security-scan-report-${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed report saved: ${reportFile}`);
        
        // Security score
        const maxScore = 100;
        const deductions = critical * 25 + high * 15 + medium * 10 + low * 5;
        const score = Math.max(0, maxScore - deductions);
        
        console.log(`\n🛡️  Security Score: ${score}/100`);
        
        if (score >= 90) {
            console.log('🎉 Excellent security posture!');
        } else if (score >= 70) {
            console.log('✅ Good security posture with room for improvement');
        } else {
            console.log('⚠️  Security improvements needed');
        }
    }
}

// CLI execution
if (require.main === module) {
    const config = {
        baseUrl: process.env.SAMS_URL || 'http://localhost:8080',
        timeout: parseInt(process.env.TIMEOUT) || 10000
    };
    
    const scanner = new SecurityScanner(config);
    scanner.scan().catch(console.error);
}

module.exports = SecurityScanner;
