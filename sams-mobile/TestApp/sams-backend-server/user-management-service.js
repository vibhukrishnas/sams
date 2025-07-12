// SAMS User Management Service
// Phase 2 Week 4: Complete User Management with JWT, RBAC, and LDAP

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

const PORT = process.env.USER_SERVICE_PORT || 8085;

class UserManagementService {
  constructor() {
    this.users = new Map();
    this.refreshTokens = new Map();
    this.sessions = new Map();
    this.passwordHistory = new Map();
    this.loginAttempts = new Map();
    
    this.config = {
      jwt: {
        secret: process.env.JWT_SECRET || 'sams-jwt-secret-change-in-production',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d'
      },
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        historyCount: 5
      },
      security: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
      },
      ldap: {
        enabled: process.env.LDAP_ENABLED === 'true',
        url: process.env.LDAP_URL || 'ldap://localhost:389',
        baseDN: process.env.LDAP_BASE_DN || 'dc=company,dc=com',
        bindDN: process.env.LDAP_BIND_DN || 'cn=admin,dc=company,dc=com',
        bindPassword: process.env.LDAP_BIND_PASSWORD || 'admin'
      }
    };
    
    this.roles = {
      admin: {
        name: 'Administrator',
        permissions: ['*'], // All permissions
        description: 'Full system access'
      },
      manager: {
        name: 'Manager',
        permissions: [
          'servers:read', 'servers:write', 'servers:delete',
          'alerts:read', 'alerts:write', 'alerts:acknowledge',
          'users:read', 'users:write',
          'reports:read', 'reports:generate'
        ],
        description: 'Management level access'
      },
      user: {
        name: 'User',
        permissions: [
          'servers:read',
          'alerts:read', 'alerts:acknowledge',
          'reports:read'
        ],
        description: 'Standard user access'
      }
    };
    
    this.initializeDefaultUsers();
    this.startCleanupTasks();
  }

  initializeDefaultUsers() {
    // Create default admin user
    const adminUser = {
      id: crypto.randomUUID(),
      username: 'admin',
      email: 'admin@sams.local',
      password: bcrypt.hashSync('Admin123!', 12),
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      active: true,
      emailVerified: true,
      mfaEnabled: false,
      mfaSecret: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      passwordChangedAt: new Date().toISOString(),
      loginAttempts: 0,
      lockedUntil: null
    };
    
    this.users.set(adminUser.id, adminUser);
    console.log('✅ Default admin user created (username: admin, password: Admin123!)');
  }

  startCleanupTasks() {
    // Clean expired refresh tokens every hour
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
    
    // Clean expired sessions every 30 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 30 * 60 * 1000);
    
    // Reset login attempts every hour
    setInterval(() => {
      this.resetLoginAttempts();
    }, 60 * 60 * 1000);
  }

  // =============================================================================
  // PASSWORD VALIDATION AND SECURITY
  // =============================================================================

  validatePassword(password) {
    const errors = [];
    const config = this.config.password;
    
    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    }
    
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async checkPasswordHistory(userId, newPassword) {
    const history = this.passwordHistory.get(userId) || [];
    
    for (const oldPasswordHash of history) {
      if (await bcrypt.compare(newPassword, oldPasswordHash)) {
        return false; // Password was used before
      }
    }
    
    return true; // Password is new
  }

  async updatePasswordHistory(userId, passwordHash) {
    const history = this.passwordHistory.get(userId) || [];
    history.unshift(passwordHash);
    
    // Keep only the last N passwords
    if (history.length > this.config.password.historyCount) {
      history.splice(this.config.password.historyCount);
    }
    
    this.passwordHistory.set(userId, history);
  }

  // =============================================================================
  // JWT TOKEN MANAGEMENT
  // =============================================================================

  generateTokens(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: this.roles[user.role]?.permissions || []
    };
    
    const accessToken = jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.accessTokenExpiry
    });
    
    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      this.config.jwt.secret,
      { expiresIn: this.config.jwt.refreshTokenExpiry }
    );
    
    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    return { accessToken, refreshToken };
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async refreshAccessToken(refreshToken) {
    const tokenData = this.refreshTokens.get(refreshToken);
    
    if (!tokenData || tokenData.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }
    
    const user = this.users.get(tokenData.userId);
    if (!user || !user.active) {
      throw new Error('User not found or inactive');
    }
    
    // Generate new access token
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: this.roles[user.role]?.permissions || []
    };
    
    const accessToken = jwt.sign(payload, this.config.jwt.secret, {
      expiresIn: this.config.jwt.accessTokenExpiry
    });
    
    return accessToken;
  }

  // =============================================================================
  // LDAP INTEGRATION
  // =============================================================================

  async authenticateWithLDAP(username, password) {
    if (!this.config.ldap.enabled) {
      return null;
    }
    
    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: this.config.ldap.url
      });
      
      // Bind with service account
      client.bind(this.config.ldap.bindDN, this.config.ldap.bindPassword, (err) => {
        if (err) {
          client.destroy();
          return reject(new Error('LDAP bind failed'));
        }
        
        // Search for user
        const searchFilter = `(|(uid=${username})(sAMAccountName=${username})(mail=${username}))`;
        const searchOptions = {
          scope: 'sub',
          filter: searchFilter,
          attributes: ['dn', 'uid', 'sAMAccountName', 'mail', 'cn', 'givenName', 'sn']
        };
        
        client.search(this.config.ldap.baseDN, searchOptions, (err, res) => {
          if (err) {
            client.destroy();
            return reject(new Error('LDAP search failed'));
          }
          
          let userDN = null;
          let userInfo = null;
          
          res.on('searchEntry', (entry) => {
            userDN = entry.dn;
            userInfo = entry.object;
          });
          
          res.on('end', () => {
            if (!userDN) {
              client.destroy();
              return resolve(null); // User not found
            }
            
            // Try to bind with user credentials
            client.bind(userDN, password, (err) => {
              client.destroy();
              
              if (err) {
                return resolve(null); // Authentication failed
              }
              
              // Authentication successful
              resolve({
                username: userInfo.uid || userInfo.sAMAccountName,
                email: userInfo.mail,
                firstName: userInfo.givenName,
                lastName: userInfo.sn,
                displayName: userInfo.cn
              });
            });
          });
          
          res.on('error', (err) => {
            client.destroy();
            reject(new Error('LDAP search error'));
          });
        });
      });
    });
  }

  // =============================================================================
  // BRUTE FORCE PROTECTION
  // =============================================================================

  checkLoginAttempts(identifier) {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lockedUntil: null };
    
    if (attempts.lockedUntil && attempts.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((attempts.lockedUntil - new Date()) / 1000 / 60);
      throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
    }
    
    return attempts;
  }

  recordFailedLogin(identifier) {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lockedUntil: null };
    attempts.count++;
    attempts.lastAttempt = new Date();
    
    if (attempts.count >= this.config.security.maxLoginAttempts) {
      attempts.lockedUntil = new Date(Date.now() + this.config.security.lockoutDuration);
      console.log(`🔒 Account locked: ${identifier} (${attempts.count} failed attempts)`);
    }
    
    this.loginAttempts.set(identifier, attempts);
  }

  recordSuccessfulLogin(identifier) {
    this.loginAttempts.delete(identifier);
  }

  // =============================================================================
  // CLEANUP TASKS
  // =============================================================================

  cleanupExpiredTokens() {
    const now = new Date();
    let cleaned = 0;
    
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.expiresAt < now) {
        this.refreshTokens.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired refresh tokens`);
    }
  }

  cleanupExpiredSessions() {
    const now = new Date();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
    }
  }

  resetLoginAttempts() {
    const now = new Date();
    let reset = 0;
    
    for (const [identifier, attempts] of this.loginAttempts.entries()) {
      if (attempts.lockedUntil && attempts.lockedUntil < now) {
        this.loginAttempts.delete(identifier);
        reset++;
      }
    }
    
    if (reset > 0) {
      console.log(`🔓 Reset ${reset} locked accounts`);
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  hasPermission(userRole, permission) {
    const role = this.roles[userRole];
    if (!role) return false;
    
    // Admin has all permissions
    if (role.permissions.includes('*')) return true;
    
    // Check specific permission
    return role.permissions.includes(permission);
  }

  getUserStats() {
    const totalUsers = this.users.size;
    const activeUsers = Array.from(this.users.values()).filter(u => u.active).length;
    const lockedUsers = Array.from(this.loginAttempts.values()).filter(a => a.lockedUntil && a.lockedUntil > new Date()).length;
    
    const roleStats = {};
    for (const role of Object.keys(this.roles)) {
      roleStats[role] = Array.from(this.users.values()).filter(u => u.role === role).length;
    }
    
    return {
      total: totalUsers,
      active: activeUsers,
      locked: lockedUsers,
      byRole: roleStats,
      activeSessions: this.sessions.size,
      activeRefreshTokens: this.refreshTokens.size
    };
  }
}

// Initialize service
const userService = new UserManagementService();

// =============================================================================
// REST API ENDPOINTS
// =============================================================================

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    const decoded = userService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
};

// Middleware for role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// User Registration
app.post('/api/v1/auth/register', [
  body('username').isLength({ min: 3, max: 50 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').isLength({ min: 1, max: 50 }).trim(),
  body('lastName').isLength({ min: 1, max: 50 }).trim(),
  body('role').optional().isIn(['admin', 'manager', 'user'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, firstName, lastName, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = Array.from(userService.users.values()).find(
      u => u.username === username || u.email === email
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // Validate password
    const passwordValidation = userService.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userId = crypto.randomUUID();
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role,
      firstName,
      lastName,
      active: true,
      emailVerified: false,
      mfaEnabled: false,
      mfaSecret: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      passwordChangedAt: new Date().toISOString(),
      loginAttempts: 0,
      lockedUntil: null
    };

    userService.users.set(userId, user);
    await userService.updatePasswordHistory(userId, hashedPassword);

    console.log(`👤 User registered: ${username} (${role})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: userId,
        username,
        email,
        firstName,
        lastName,
        role,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// User Login
app.post('/api/v1/auth/login', [
  body('username').notEmpty().trim(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;
    const clientIP = req.ip;

    // Check login attempts
    try {
      userService.checkLoginAttempts(username);
      userService.checkLoginAttempts(clientIP);
    } catch (error) {
      return res.status(423).json({
        success: false,
        error: error.message,
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Try LDAP authentication first
    let ldapUser = null;
    if (userService.config.ldap.enabled) {
      try {
        ldapUser = await userService.authenticateWithLDAP(username, password);
      } catch (error) {
        console.log('LDAP authentication failed:', error.message);
      }
    }

    let user = null;

    if (ldapUser) {
      // LDAP authentication successful - find or create user
      user = Array.from(userService.users.values()).find(u => u.username === ldapUser.username);

      if (!user) {
        // Create user from LDAP
        const userId = crypto.randomUUID();
        user = {
          id: userId,
          username: ldapUser.username,
          email: ldapUser.email,
          password: null, // No local password for LDAP users
          role: 'user', // Default role for LDAP users
          firstName: ldapUser.firstName,
          lastName: ldapUser.lastName,
          active: true,
          emailVerified: true,
          mfaEnabled: false,
          mfaSecret: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLogin: null,
          passwordChangedAt: null,
          loginAttempts: 0,
          lockedUntil: null,
          ldapUser: true
        };

        userService.users.set(userId, user);
        console.log(`👤 LDAP user created: ${user.username}`);
      }
    } else {
      // Local authentication
      user = Array.from(userService.users.values()).find(
        u => u.username === username || u.email === username
      );

      if (!user || !user.password) {
        userService.recordFailedLogin(username);
        userService.recordFailedLogin(clientIP);
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        userService.recordFailedLogin(username);
        userService.recordFailedLogin(clientIP);
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }
    }

    // Check if user is active
    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Successful login
    userService.recordSuccessfulLogin(username);
    userService.recordSuccessfulLogin(clientIP);

    // Update last login
    user.lastLogin = new Date().toISOString();

    // Generate tokens
    const tokens = userService.generateTokens(user);

    // Create session
    const sessionId = crypto.randomUUID();
    userService.sessions.set(sessionId, {
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + userService.config.security.sessionTimeout),
      ip: clientIP,
      userAgent: req.get('User-Agent')
    });

    console.log(`🔐 User logged in: ${user.username} from ${clientIP}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: userService.roles[user.role]?.permissions || [],
          mfaEnabled: user.mfaEnabled,
          lastLogin: user.lastLogin
        },
        tokens: tokens,
        sessionId: sessionId
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Refresh Token
app.post('/api/v1/auth/refresh', [
  body('refreshToken').notEmpty()
], async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const accessToken = await userService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: {
        accessToken
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
      code: 'REFRESH_FAILED'
    });
  }
});

// Logout
app.post('/api/v1/auth/logout', authenticateToken, (req, res) => {
  try {
    const { sessionId, refreshToken } = req.body;

    // Remove session
    if (sessionId) {
      userService.sessions.delete(sessionId);
    }

    // Remove refresh token
    if (refreshToken) {
      userService.refreshTokens.delete(refreshToken);
    }

    console.log(`🔓 User logged out: ${req.user.username}`);

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Get Current User Profile
app.get('/api/v1/auth/profile', authenticateToken, (req, res) => {
  try {
    const user = userService.users.get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: userService.roles[user.role]?.permissions || [],
        active: user.active,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        ldapUser: user.ldapUser || false
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// Health Check
app.get('/api/v1/users/health', (req, res) => {
  res.json({
    success: true,
    service: 'SAMS User Management Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: userService.getUserStats()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`👤 SAMS User Management Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/users/health`);
  console.log(`🔐 Authentication endpoints available`);
  console.log(`📋 LDAP integration: ${userService.config.ldap.enabled ? 'Enabled' : 'Disabled'}`);
});

// Export for use in other modules
module.exports = {
  userService,
  UserManagementService,
  authenticateToken,
  requireRole
};
