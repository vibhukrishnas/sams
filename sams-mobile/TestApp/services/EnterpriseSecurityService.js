/**
 * 🔥 ENTERPRISE SECURITY SERVICE
 * Handles MFA, encryption, audit logs, compliance, and advanced security
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import TouchID from 'react-native-touch-id';
import { Alert, Platform } from 'react-native';

class EnterpriseSecurityService {
  constructor() {
    this.baseURL = 'http://192.168.1.10:8080/api/security';
    this.encryptionKey = null;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.lastActivity = Date.now();
    this.auditLogs = [];
    this.securityPolicies = {
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      passwordRequireNumbers: true,
      passwordRequireUppercase: true,
      sessionTimeout: 30, // minutes
      maxLoginAttempts: 5,
      lockoutDuration: 15, // minutes
      mfaRequired: true,
      biometricEnabled: true,
      encryptionRequired: true
    };
    this.loginAttempts = new Map();
    this.lockedAccounts = new Map();
    
    this.initializeSecurity();
  }

  /**
   * Initialize security service
   */
  async initializeSecurity() {
    try {
      console.log('🔥 EnterpriseSecurityService: Initializing security...');
      
      // Generate or load encryption key
      await this.initializeEncryption();
      
      // Load security policies
      await this.loadSecurityPolicies();
      
      // Setup session monitoring
      this.setupSessionMonitoring();
      
      // Load audit logs
      await this.loadAuditLogs();
      
      console.log('🔥 EnterpriseSecurityService: Security initialized successfully');
    } catch (error) {
      console.error('EnterpriseSecurityService initialization error:', error);
    }
  }

  /**
   * Initialize encryption
   */
  async initializeEncryption() {
    try {
      let encryptionKey = await AsyncStorage.getItem('encryptionKey');
      
      if (!encryptionKey) {
        // Generate new encryption key
        encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
        await AsyncStorage.setItem('encryptionKey', encryptionKey);
        console.log('EnterpriseSecurityService: New encryption key generated');
      }
      
      this.encryptionKey = encryptionKey;
    } catch (error) {
      console.error('EnterpriseSecurityService: Encryption initialization error', error);
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }
      
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('EnterpriseSecurityService: Encryption error', error);
      return null;
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }
      
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('EnterpriseSecurityService: Decryption error', error);
      return null;
    }
  }

  /**
   * Authenticate with Multi-Factor Authentication
   */
  async authenticateWithMFA(username, password, mfaCode = null) {
    try {
      console.log('🔥 EnterpriseSecurityService: MFA authentication for', username);
      
      // Check if account is locked
      if (this.isAccountLocked(username)) {
        throw new Error('Account is temporarily locked due to multiple failed attempts');
      }
      
      // Validate password strength
      if (!this.validatePasswordStrength(password)) {
        throw new Error('Password does not meet security requirements');
      }
      
      // First factor: username/password
      const authResponse = await fetch(`${this.baseURL}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password,
          mfaCode,
          deviceInfo: await this.getDeviceInfo()
        })
      });
      
      if (!authResponse.ok) {
        this.recordFailedLogin(username);
        throw new Error('Authentication failed');
      }
      
      const authData = await authResponse.json();
      
      // If MFA is required and not provided
      if (authData.mfaRequired && !mfaCode) {
        return {
          success: false,
          mfaRequired: true,
          mfaMethod: authData.mfaMethod,
          tempToken: authData.tempToken
        };
      }
      
      // Clear failed login attempts
      this.clearFailedLogins(username);
      
      // Store encrypted auth token
      const encryptedToken = this.encrypt(authData.token);
      await AsyncStorage.setItem('authToken', authData.token);
      await AsyncStorage.setItem('encryptedAuthToken', encryptedToken);
      
      // Log successful authentication
      await this.logSecurityEvent('authentication_success', {
        username,
        method: 'mfa',
        deviceInfo: await this.getDeviceInfo()
      });
      
      return {
        success: true,
        token: authData.token,
        user: authData.user,
        permissions: authData.permissions
      };
    } catch (error) {
      console.error('EnterpriseSecurityService: MFA authentication error', error);
      
      await this.logSecurityEvent('authentication_failed', {
        username,
        error: error.message,
        deviceInfo: await this.getDeviceInfo()
      });
      
      throw error;
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometrics() {
    try {
      console.log('🔥 EnterpriseSecurityService: Biometric authentication');
      
      if (!this.securityPolicies.biometricEnabled) {
        throw new Error('Biometric authentication is disabled');
      }
      
      // Check biometric availability
      const biometryType = await TouchID.isSupported();
      if (!biometryType) {
        throw new Error('Biometric authentication not available');
      }
      
      // Authenticate with biometrics
      await TouchID.authenticate('Authenticate to access SAMS', {
        title: 'SAMS Authentication',
        subtitle: 'Use your biometric to authenticate',
        description: 'Place your finger on the sensor or look at the camera',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        passcodeFallback: true,
        showErrorAlert: true,
        errorAlertMessage: 'Authentication failed',
        errorAlertTitle: 'Error'
      });
      
      // Get stored encrypted token
      const encryptedToken = await AsyncStorage.getItem('encryptedAuthToken');
      if (!encryptedToken) {
        throw new Error('No stored authentication token');
      }
      
      // Decrypt token
      const token = this.decrypt(encryptedToken);
      if (!token) {
        throw new Error('Failed to decrypt authentication token');
      }
      
      // Verify token with backend
      const verifyResponse = await fetch(`${this.baseURL}/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!verifyResponse.ok) {
        throw new Error('Token verification failed');
      }
      
      const userData = await verifyResponse.json();
      
      // Log successful biometric authentication
      await this.logSecurityEvent('biometric_authentication_success', {
        biometryType,
        deviceInfo: await this.getDeviceInfo()
      });
      
      return {
        success: true,
        token,
        user: userData.user,
        permissions: userData.permissions
      };
    } catch (error) {
      console.error('EnterpriseSecurityService: Biometric authentication error', error);
      
      await this.logSecurityEvent('biometric_authentication_failed', {
        error: error.message,
        deviceInfo: await this.getDeviceInfo()
      });
      
      throw error;
    }
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const policies = this.securityPolicies;
    
    if (password.length < policies.passwordMinLength) {
      return false;
    }
    
    if (policies.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }
    
    if (policies.passwordRequireNumbers && !/\d/.test(password)) {
      return false;
    }
    
    if (policies.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return false;
    }
    
    return true;
  }

  /**
   * Record failed login attempt
   */
  recordFailedLogin(username) {
    const attempts = this.loginAttempts.get(username) || 0;
    const newAttempts = attempts + 1;
    
    this.loginAttempts.set(username, newAttempts);
    
    if (newAttempts >= this.securityPolicies.maxLoginAttempts) {
      this.lockAccount(username);
    }
  }

  /**
   * Clear failed login attempts
   */
  clearFailedLogins(username) {
    this.loginAttempts.delete(username);
  }

  /**
   * Lock account
   */
  lockAccount(username) {
    const lockUntil = Date.now() + (this.securityPolicies.lockoutDuration * 60 * 1000);
    this.lockedAccounts.set(username, lockUntil);
    
    console.log(`EnterpriseSecurityService: Account ${username} locked until`, new Date(lockUntil));
    
    this.logSecurityEvent('account_locked', {
      username,
      lockUntil: new Date(lockUntil).toISOString(),
      reason: 'max_login_attempts_exceeded'
    });
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(username) {
    const lockUntil = this.lockedAccounts.get(username);
    
    if (!lockUntil) {
      return false;
    }
    
    if (Date.now() > lockUntil) {
      this.lockedAccounts.delete(username);
      return false;
    }
    
    return true;
  }

  /**
   * Setup session monitoring
   */
  setupSessionMonitoring() {
    // Monitor user activity
    setInterval(() => {
      this.checkSessionTimeout();
    }, 60000); // Check every minute
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Check session timeout
   */
  async checkSessionTimeout() {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    
    if (timeSinceLastActivity > this.sessionTimeout) {
      console.log('EnterpriseSecurityService: Session timeout detected');
      
      await this.logSecurityEvent('session_timeout', {
        lastActivity: new Date(this.lastActivity).toISOString(),
        timeoutDuration: this.sessionTimeout
      });
      
      // Clear stored tokens
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('encryptedAuthToken');
      
      // Notify app of session timeout
      this.notifySessionTimeout();
    }
  }

  /**
   * Notify app of session timeout
   */
  notifySessionTimeout() {
    Alert.alert(
      'Session Expired',
      'Your session has expired due to inactivity. Please log in again.',
      [{ text: 'OK', onPress: () => this.redirectToLogin() }]
    );
  }

  /**
   * Redirect to login
   */
  redirectToLogin() {
    // This will be handled by navigation service
    console.log('EnterpriseSecurityService: Redirecting to login');
  }

  /**
   * Log security event
   */
  async logSecurityEvent(eventType, details) {
    try {
      const logEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        eventType,
        details,
        deviceInfo: await this.getDeviceInfo(),
        ipAddress: await this.getIPAddress()
      };
      
      // Store locally
      this.auditLogs.push(logEntry);
      
      // Keep only last 1000 logs
      if (this.auditLogs.length > 1000) {
        this.auditLogs = this.auditLogs.slice(-1000);
      }
      
      // Save to storage
      await this.saveAuditLogs();
      
      // Send to backend
      await this.sendAuditLogToBackend(logEntry);
      
      console.log('EnterpriseSecurityService: Security event logged:', eventType);
    } catch (error) {
      console.error('EnterpriseSecurityService: Log security event error', error);
    }
  }

  /**
   * Send audit log to backend
   */
  async sendAuditLogToBackend(logEntry) {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      
      await fetch(`${this.baseURL}/audit-logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error('EnterpriseSecurityService: Send audit log error', error);
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants.Model || 'Unknown',
      brand: Platform.constants.Brand || 'Unknown',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get IP address
   */
  async getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  /**
   * Hash password with salt
   */
  hashPassword(password, salt = null) {
    if (!salt) {
      salt = CryptoJS.lib.WordArray.random(128/8).toString();
    }
    
    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
    
    return { hash, salt };
  }

  /**
   * Verify password hash
   */
  verifyPassword(password, hash, salt) {
    const computed = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
    
    return computed === hash;
  }

  /**
   * Load security policies
   */
  async loadSecurityPolicies() {
    try {
      const stored = await AsyncStorage.getItem('securityPolicies');
      if (stored) {
        this.securityPolicies = { ...this.securityPolicies, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('EnterpriseSecurityService: Load security policies error', error);
    }
  }

  /**
   * Update security policies
   */
  async updateSecurityPolicies(policies) {
    try {
      this.securityPolicies = { ...this.securityPolicies, ...policies };
      await AsyncStorage.setItem('securityPolicies', JSON.stringify(this.securityPolicies));
      
      await this.logSecurityEvent('security_policies_updated', {
        updatedPolicies: policies
      });
    } catch (error) {
      console.error('EnterpriseSecurityService: Update security policies error', error);
    }
  }

  /**
   * Load audit logs
   */
  async loadAuditLogs() {
    try {
      const stored = await AsyncStorage.getItem('auditLogs');
      if (stored) {
        this.auditLogs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('EnterpriseSecurityService: Load audit logs error', error);
    }
  }

  /**
   * Save audit logs
   */
  async saveAuditLogs() {
    try {
      await AsyncStorage.setItem('auditLogs', JSON.stringify(this.auditLogs));
    } catch (error) {
      console.error('EnterpriseSecurityService: Save audit logs error', error);
    }
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit = 100) {
    return this.auditLogs.slice(-limit).reverse();
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      encryptionEnabled: !!this.encryptionKey,
      biometricEnabled: this.securityPolicies.biometricEnabled,
      mfaRequired: this.securityPolicies.mfaRequired,
      sessionTimeout: this.securityPolicies.sessionTimeout,
      lastActivity: new Date(this.lastActivity).toISOString(),
      auditLogsCount: this.auditLogs.length,
      lockedAccountsCount: this.lockedAccounts.size,
      failedLoginAttempts: this.loginAttempts.size
    };
  }

  /**
   * Perform security health check
   */
  async performSecurityHealthCheck() {
    const issues = [];
    
    // Check encryption
    if (!this.encryptionKey) {
      issues.push('Encryption not properly initialized');
    }
    
    // Check session timeout
    if (this.securityPolicies.sessionTimeout > 60) {
      issues.push('Session timeout is too long (>60 minutes)');
    }
    
    // Check password policies
    if (this.securityPolicies.passwordMinLength < 8) {
      issues.push('Password minimum length is too short (<8 characters)');
    }
    
    // Check MFA
    if (!this.securityPolicies.mfaRequired) {
      issues.push('Multi-factor authentication is not required');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      score: Math.max(0, 100 - (issues.length * 20))
    };
  }

  /**
   * Clear all security data
   */
  async clearSecurityData() {
    try {
      await AsyncStorage.multiRemove([
        'authToken',
        'encryptedAuthToken',
        'encryptionKey',
        'securityPolicies',
        'auditLogs'
      ]);
      
      this.encryptionKey = null;
      this.auditLogs = [];
      this.loginAttempts.clear();
      this.lockedAccounts.clear();
      
      console.log('EnterpriseSecurityService: All security data cleared');
    } catch (error) {
      console.error('EnterpriseSecurityService: Clear security data error', error);
    }
  }
}

export default new EnterpriseSecurityService();
