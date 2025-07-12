// SAMS Security Service
// Phase 2 Week 7: Enterprise-Grade Security Implementation

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

class SecurityService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationIterations = 100000;
    this.saltLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    
    this.securityConfig = {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        preventReuse: 5 // Last 5 passwords
      },
      sessionSecurity: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        renewThreshold: 2 * 60 * 60 * 1000, // 2 hours
        maxConcurrentSessions: 5,
        requireSecureCookies: true
      },
      bruteForceProtection: {
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        progressiveLockout: true
      },
      encryption: {
        atRest: true,
        inTransit: true,
        keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
      }
    };
    
    this.securityEvents = [];
    this.threatDetection = {
      suspiciousIPs: new Map(),
      failedAttempts: new Map(),
      anomalousPatterns: new Map()
    };
    
    this.initializeSecurity();
  }

  async initializeSecurity() {
    console.log('🔒 Initializing SAMS Security Service...');
    
    // Load or generate encryption keys
    await this.loadEncryptionKeys();
    
    // Initialize threat detection
    this.startThreatDetection();
    
    // Setup security monitoring
    this.startSecurityMonitoring();
    
    console.log('✅ Security service initialized');
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  async loadEncryptionKeys() {
    try {
      const keyPath = path.join(__dirname, '.security', 'encryption.key');
      
      try {
        const keyData = await fs.readFile(keyPath, 'utf8');
        this.encryptionKey = keyData.trim();
        console.log('✅ Encryption key loaded from file');
      } catch (error) {
        // Generate new key if file doesn't exist
        await fs.mkdir(path.dirname(keyPath), { recursive: true });
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });
        console.log('✅ New encryption key generated and saved');
      }
    } catch (error) {
      console.error('❌ Error loading encryption keys:', error);
      throw error;
    }
  }

  // =============================================================================
  // ENCRYPTION AT REST
  // =============================================================================

  async encryptData(data, additionalData = '') {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Derive key from master key and salt
      const key = crypto.pbkdf2Sync(
        Buffer.from(this.encryptionKey, 'hex'),
        salt,
        this.keyDerivationIterations,
        32,
        'sha256'
      );
      
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from(additionalData));
      
      const dataBuffer = Buffer.from(JSON.stringify(data));
      let encrypted = cipher.update(dataBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();
      
      // Combine salt, iv, tag, and encrypted data
      const result = Buffer.concat([salt, iv, tag, encrypted]);
      
      return {
        encrypted: result.toString('base64'),
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Data encryption failed');
    }
  }

  async decryptData(encryptedData, additionalData = '') {
    try {
      const data = Buffer.from(encryptedData.encrypted, 'base64');
      
      // Extract components
      const salt = data.slice(0, this.saltLength);
      const iv = data.slice(this.saltLength, this.saltLength + this.ivLength);
      const tag = data.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
      const encrypted = data.slice(this.saltLength + this.ivLength + this.tagLength);
      
      // Derive key
      const key = crypto.pbkdf2Sync(
        Buffer.from(this.encryptionKey, 'hex'),
        salt,
        this.keyDerivationIterations,
        32,
        'sha256'
      );
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from(additionalData));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return JSON.parse(decrypted.toString());
      
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Data decryption failed');
    }
  }

  // =============================================================================
  // PASSWORD SECURITY
  // =============================================================================

  validatePassword(password) {
    const policy = this.securityConfig.passwordPolicy;
    const errors = [];
    
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }
    
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 20);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Common patterns
    
    if (score < 30) return 'weak';
    if (score < 60) return 'medium';
    if (score < 80) return 'strong';
    return 'very-strong';
  }

  async hashPassword(password) {
    const validation = this.validatePassword(password);
    if (!validation.valid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }
    
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // =============================================================================
  // MULTI-FACTOR AUTHENTICATION
  // =============================================================================

  generateMFASecret(username, issuer = 'SAMS') {
    return speakeasy.generateSecret({
      name: `${issuer} (${username})`,
      issuer: issuer,
      length: 32
    });
  }

  verifyMFAToken(secret, token, window = 2) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: window
    });
  }

  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // =============================================================================
  // THREAT DETECTION
  // =============================================================================

  startThreatDetection() {
    // Monitor for suspicious patterns every minute
    setInterval(() => {
      this.analyzeThreatPatterns();
    }, 60000);
    
    console.log('🛡️ Threat detection started');
  }

  recordSecurityEvent(type, details, severity = 'info') {
    const event = {
      id: crypto.randomUUID(),
      type,
      details,
      severity,
      timestamp: new Date().toISOString(),
      ip: details.ip || 'unknown'
    };
    
    this.securityEvents.push(event);
    
    // Keep only last 10000 events
    if (this.securityEvents.length > 10000) {
      this.securityEvents.splice(0, this.securityEvents.length - 10000);
    }
    
    // Alert on high severity events
    if (severity === 'critical' || severity === 'high') {
      this.alertSecurityTeam(event);
    }
    
    console.log(`[SECURITY] ${type}:`, details);
  }

  analyzeThreatPatterns() {
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    
    // Analyze recent events
    const recentEvents = this.securityEvents.filter(
      event => now - new Date(event.timestamp).getTime() < timeWindow
    );
    
    // Group by IP
    const eventsByIP = new Map();
    recentEvents.forEach(event => {
      if (!eventsByIP.has(event.ip)) {
        eventsByIP.set(event.ip, []);
      }
      eventsByIP.get(event.ip).push(event);
    });
    
    // Detect suspicious patterns
    eventsByIP.forEach((events, ip) => {
      const failedLogins = events.filter(e => e.type === 'LOGIN_FAILED').length;
      const apiErrors = events.filter(e => e.type === 'API_ERROR').length;
      
      // Too many failed logins
      if (failedLogins > 10) {
        this.recordSecurityEvent('BRUTE_FORCE_DETECTED', {
          ip,
          failedAttempts: failedLogins,
          timeWindow: '5 minutes'
        }, 'high');
      }
      
      // Too many API errors (potential scanning)
      if (apiErrors > 50) {
        this.recordSecurityEvent('API_SCANNING_DETECTED', {
          ip,
          errorCount: apiErrors,
          timeWindow: '5 minutes'
        }, 'medium');
      }
    });
  }

  alertSecurityTeam(event) {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.log(`🚨 SECURITY ALERT: ${event.type}`, event.details);
  }

  // =============================================================================
  // SECURITY MONITORING
  // =============================================================================

  startSecurityMonitoring() {
    // Generate security reports every hour
    setInterval(() => {
      this.generateSecurityReport();
    }, 60 * 60 * 1000);
    
    console.log('📊 Security monitoring started');
  }

  generateSecurityReport() {
    const now = Date.now();
    const last24Hours = 24 * 60 * 60 * 1000;
    
    const recentEvents = this.securityEvents.filter(
      event => now - new Date(event.timestamp).getTime() < last24Hours
    );
    
    const report = {
      timestamp: new Date().toISOString(),
      period: '24 hours',
      summary: {
        totalEvents: recentEvents.length,
        criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
        highSeverityEvents: recentEvents.filter(e => e.severity === 'high').length,
        uniqueIPs: new Set(recentEvents.map(e => e.ip)).size
      },
      topEvents: this.getTopEventTypes(recentEvents),
      topIPs: this.getTopIPs(recentEvents),
      recommendations: this.generateSecurityRecommendations(recentEvents)
    };
    
    console.log('📊 Security Report Generated:', report.summary);
    return report;
  }

  getTopEventTypes(events) {
    const eventCounts = new Map();
    events.forEach(event => {
      eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
    });
    
    return Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }

  getTopIPs(events) {
    const ipCounts = new Map();
    events.forEach(event => {
      if (event.ip !== 'unknown') {
        ipCounts.set(event.ip, (ipCounts.get(event.ip) || 0) + 1);
      }
    });
    
    return Array.from(ipCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
  }

  generateSecurityRecommendations(events) {
    const recommendations = [];
    
    const failedLogins = events.filter(e => e.type === 'LOGIN_FAILED').length;
    if (failedLogins > 100) {
      recommendations.push({
        type: 'HIGH_FAILED_LOGINS',
        message: 'Consider implementing additional rate limiting for login attempts',
        priority: 'high'
      });
    }
    
    const apiErrors = events.filter(e => e.type === 'API_ERROR').length;
    if (apiErrors > 500) {
      recommendations.push({
        type: 'HIGH_API_ERRORS',
        message: 'Investigate API error patterns and consider additional input validation',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  // =============================================================================
  // SECURITY UTILITIES
  // =============================================================================

  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  hashSensitiveData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  constantTimeCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  getSecurityStats() {
    const now = Date.now();
    const last24Hours = 24 * 60 * 60 * 1000;
    
    const recentEvents = this.securityEvents.filter(
      event => now - new Date(event.timestamp).getTime() < last24Hours
    );
    
    return {
      totalEvents: this.securityEvents.length,
      recentEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      highSeverityEvents: recentEvents.filter(e => e.severity === 'high').length,
      threatDetectionActive: true,
      encryptionEnabled: true,
      lastReport: this.generateSecurityReport()
    };
  }
}

module.exports = SecurityService;
