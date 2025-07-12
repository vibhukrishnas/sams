// SAMS RESTful API Framework
// Phase 2 Week 7: Complete API Development with Security & Performance

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const redis = require('redis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { body, param, query, validationResult } = require('express-validator');

const app = express();

// Redis client for caching and rate limiting
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => {
  console.log('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected for API framework');
});

// API Configuration
const API_CONFIG = {
  version: {
    current: 'v1',
    supported: ['v1', 'v2'],
    deprecated: []
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'sams-secret-key-change-in-production',
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    mfaRequired: process.env.MFA_REQUIRED === 'true'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false
  },
  performance: {
    cacheTimeout: 300, // 5 minutes
    connectionPoolSize: 10,
    queryTimeout: 30000 // 30 seconds
  }
};

// In-memory stores (in production, use proper databases)
const users = new Map();
const apiKeys = new Map();
const sessions = new Map();
const auditLogs = [];
const ipWhitelist = new Set();
const ipBlacklist = new Set();

// API Analytics
const apiAnalytics = {
  totalRequests: 0,
  requestsByEndpoint: new Map(),
  requestsByUser: new Map(),
  errorsByEndpoint: new Map(),
  responseTimesByEndpoint: new Map(),
  lastReset: new Date()
};

// Middleware Setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-MFA-Token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// API Analytics middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Track request
  apiAnalytics.totalRequests++;
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  apiAnalytics.requestsByEndpoint.set(endpoint,
    (apiAnalytics.requestsByEndpoint.get(endpoint) || 0) + 1);

  // Track response time
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    if (!apiAnalytics.responseTimesByEndpoint.has(endpoint)) {
      apiAnalytics.responseTimesByEndpoint.set(endpoint, []);
    }
    apiAnalytics.responseTimesByEndpoint.get(endpoint).push(responseTime);

    // Track errors
    if (res.statusCode >= 400) {
      apiAnalytics.errorsByEndpoint.set(endpoint,
        (apiAnalytics.errorsByEndpoint.get(endpoint) || 0) + 1);
    }

    // Track by user
    if (req.user) {
      apiAnalytics.requestsByUser.set(req.user.id,
        (apiAnalytics.requestsByUser.get(req.user.id) || 0) + 1);
    }
  });

  next();
});

// IP Filtering middleware
const ipFilter = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  // Check blacklist
  if (ipBlacklist.has(clientIp)) {
    auditLog('IP_BLOCKED', { ip: clientIp, endpoint: req.path }, null);
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }

  // Check whitelist (if configured)
  if (ipWhitelist.size > 0 && !ipWhitelist.has(clientIp)) {
    auditLog('IP_NOT_WHITELISTED', { ip: clientIp, endpoint: req.path }, null);
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      code: 'IP_NOT_WHITELISTED'
    });
  }

  next();
};

app.use(ipFilter);

// Rate Limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message || 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient ? new (require('rate-limit-redis'))({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }) : undefined
  });
};

// Different rate limits for different endpoints
const generalRateLimit = createRateLimit(15 * 60 * 1000, 100, 'Too many requests');
const authRateLimit = createRateLimit(15 * 60 * 1000, 10, 'Too many authentication attempts');
const apiKeyRateLimit = createRateLimit(60 * 1000, 1000, 'API key rate limit exceeded');

app.use('/api/', generalRateLimit);
app.use('/api/*/auth/', authRateLimit);

// Audit logging function
function auditLog(action, details, userId) {
  const logEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    details,
    userId,
    ip: details?.ip || 'unknown'
  };

  auditLogs.push(logEntry);

  // Keep only last 10000 logs in memory
  if (auditLogs.length > 10000) {
    auditLogs.splice(0, auditLogs.length - 10000);
  }

  console.log(`[AUDIT] ${action}:`, details);
}

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      code: 'TOKEN_REQUIRED'
    });
  }

  jwt.verify(token, API_CONFIG.security.jwtSecret, (err, user) => {
    if (err) {
      auditLog('TOKEN_INVALID', { token: token.substring(0, 10) + '...' }, null);
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    req.user = user;
    next();
  });
};

// API Key Authentication middleware
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      code: 'API_KEY_REQUIRED'
    });
  }

  const keyData = apiKeys.get(apiKey);
  if (!keyData || !keyData.active) {
    auditLog('API_KEY_INVALID', { key: apiKey.substring(0, 8) + '...' }, null);
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
      code: 'API_KEY_INVALID'
    });
  }

  // Check key expiration
  if (keyData.expiresAt && new Date() > keyData.expiresAt) {
    auditLog('API_KEY_EXPIRED', { key: apiKey.substring(0, 8) + '...' }, keyData.userId);
    return res.status(403).json({
      success: false,
      error: 'API key expired',
      code: 'API_KEY_EXPIRED'
    });
  }

  // Update last used
  keyData.lastUsed = new Date();
  keyData.usageCount = (keyData.usageCount || 0) + 1;

  req.user = { id: keyData.userId, apiKey: true };
  next();
};

// MFA verification middleware
const verifyMFA = (req, res, next) => {
  if (!API_CONFIG.security.mfaRequired) {
    return next();
  }

  const mfaToken = req.headers['x-mfa-token'];
  if (!mfaToken) {
    return res.status(401).json({
      success: false,
      error: 'MFA token required',
      code: 'MFA_REQUIRED'
    });
  }

  const user = users.get(req.user.id);
  if (!user || !user.mfaSecret) {
    return res.status(403).json({
      success: false,
      error: 'MFA not configured',
      code: 'MFA_NOT_CONFIGURED'
    });
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: mfaToken,
    window: 2
  });

  if (!verified) {
    auditLog('MFA_FAILED', { userId: req.user.id }, req.user.id);
    return res.status(403).json({
      success: false,
      error: 'Invalid MFA token',
      code: 'MFA_INVALID'
    });
  }

  next();
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const user = users.get(req.user.id);
    if (!user || !roles.includes(user.role)) {
      auditLog('ACCESS_DENIED', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: user?.role
      }, req.user.id);

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Cache middleware
const cache = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Cache error:', error);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200) {
        redisClient.setex(key, duration, JSON.stringify(data)).catch(console.error);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };

    next();
  };
};

// API Version routing
const createVersionedRouter = (version) => {
  const router = express.Router();

  // Version-specific middleware
  router.use((req, res, next) => {
    req.apiVersion = version;
    res.setHeader('X-API-Version', version);
    next();
  });

  return router;
};

// Initialize API versions
const v1Router = createVersionedRouter('v1');
const v2Router = createVersionedRouter('v2');

// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================

// User registration
v1Router.post('/auth/register', [
  body('username').isLength({ min: 3, max: 50 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('role').optional().isIn(['admin', 'manager', 'user']),
  handleValidationErrors
], async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, API_CONFIG.security.bcryptRounds);

    // Create user
    const userId = crypto.randomUUID();
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
      mfaEnabled: false,
      mfaSecret: null,
      active: true
    };

    users.set(userId, user);

    auditLog('USER_REGISTERED', { userId, username, email, role }, userId);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: userId,
        username,
        email,
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

// User login
v1Router.post('/auth/login', [
  body('username').notEmpty().trim(),
  body('password').notEmpty(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = Array.from(users.values()).find(u => u.username === username || u.email === username);
    if (!user) {
      auditLog('LOGIN_FAILED', { username, reason: 'user_not_found' }, null);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      auditLog('LOGIN_FAILED', { userId: user.id, reason: 'account_locked' }, user.id);
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= API_CONFIG.security.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + API_CONFIG.security.lockoutDuration);
        auditLog('ACCOUNT_LOCKED', { userId: user.id, attempts: user.loginAttempts }, user.id);
      }

      auditLog('LOGIN_FAILED', { userId: user.id, reason: 'invalid_password', attempts: user.loginAttempts }, user.id);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      API_CONFIG.security.jwtSecret,
      { expiresIn: API_CONFIG.security.jwtExpiry }
    );

    // Create session
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      userId: user.id,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ip: req.ip
    });

    auditLog('LOGIN_SUCCESS', { userId: user.id, sessionId }, user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        sessionId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          mfaEnabled: user.mfaEnabled
        }
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

// MFA Setup
v1Router.post('/auth/mfa/setup', authenticateJWT, async (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `SAMS (${user.username})`,
      issuer: 'SAMS Infrastructure Monitoring'
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not activated until verified)
    user.mfaSecretTemp = secret.base32;

    auditLog('MFA_SETUP_INITIATED', { userId: user.id }, user.id);

    res.json({
      success: true,
      message: 'MFA setup initiated',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32
      }
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA setup failed',
      code: 'MFA_SETUP_ERROR'
    });
  }
});

// MFA Verification and Activation
v1Router.post('/auth/mfa/verify', [
  authenticateJWT,
  body('token').isLength({ min: 6, max: 6 }).isNumeric(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { token } = req.body;
    const user = users.get(req.user.id);

    if (!user || !user.mfaSecretTemp) {
      return res.status(400).json({
        success: false,
        error: 'MFA setup not initiated',
        code: 'MFA_NOT_INITIATED'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecretTemp,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      auditLog('MFA_VERIFICATION_FAILED', { userId: user.id }, user.id);
      return res.status(400).json({
        success: false,
        error: 'Invalid MFA token',
        code: 'MFA_INVALID'
      });
    }

    // Activate MFA
    user.mfaSecret = user.mfaSecretTemp;
    user.mfaEnabled = true;
    delete user.mfaSecretTemp;

    auditLog('MFA_ACTIVATED', { userId: user.id }, user.id);

    res.json({
      success: true,
      message: 'MFA activated successfully',
      data: {
        mfaEnabled: true
      }
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA verification failed',
      code: 'MFA_VERIFICATION_ERROR'
    });
  }
});

// =============================================================================
// API KEY MANAGEMENT
// =============================================================================

// Create API Key
v1Router.post('/auth/api-keys', [
  authenticateJWT,
  body('name').isLength({ min: 1, max: 100 }).trim(),
  body('permissions').optional().isArray(),
  body('expiresIn').optional().isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { name, permissions = [], expiresIn } = req.body;

    // Generate API key
    const apiKey = 'sams_' + crypto.randomBytes(32).toString('hex');

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + (expiresIn * 24 * 60 * 60 * 1000)); // days to milliseconds
    }

    const keyData = {
      id: crypto.randomUUID(),
      key: apiKey,
      name,
      userId: req.user.id,
      permissions,
      createdAt: new Date().toISOString(),
      expiresAt,
      lastUsed: null,
      usageCount: 0,
      active: true
    };

    apiKeys.set(apiKey, keyData);

    auditLog('API_KEY_CREATED', {
      keyId: keyData.id,
      name,
      userId: req.user.id,
      expiresAt
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        id: keyData.id,
        key: apiKey,
        name,
        permissions,
        createdAt: keyData.createdAt,
        expiresAt
      }
    });

  } catch (error) {
    console.error('API key creation error:', error);
    res.status(500).json({
      success: false,
      error: 'API key creation failed',
      code: 'API_KEY_CREATION_ERROR'
    });
  }
});

// List API Keys
v1Router.get('/auth/api-keys', authenticateJWT, async (req, res) => {
  try {
    const userKeys = Array.from(apiKeys.values())
      .filter(key => key.userId === req.user.id)
      .map(key => ({
        id: key.id,
        name: key.name,
        permissions: key.permissions,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        lastUsed: key.lastUsed,
        usageCount: key.usageCount,
        active: key.active,
        key: key.key.substring(0, 12) + '...' // Masked key
      }));

    res.json({
      success: true,
      data: {
        total: userKeys.length,
        keys: userKeys
      }
    });

  } catch (error) {
    console.error('API keys list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve API keys',
      code: 'API_KEYS_LIST_ERROR'
    });
  }
});

// Revoke API Key
v1Router.delete('/auth/api-keys/:keyId', [
  authenticateJWT,
  param('keyId').isUUID(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { keyId } = req.params;

    // Find the key
    const keyEntry = Array.from(apiKeys.entries()).find(([key, data]) =>
      data.id === keyId && data.userId === req.user.id
    );

    if (!keyEntry) {
      return res.status(404).json({
        success: false,
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
    }

    const [apiKey, keyData] = keyEntry;

    // Remove the key
    apiKeys.delete(apiKey);

    auditLog('API_KEY_REVOKED', {
      keyId,
      name: keyData.name,
      userId: req.user.id
    }, req.user.id);

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });

  } catch (error) {
    console.error('API key revocation error:', error);
    res.status(500).json({
      success: false,
      error: 'API key revocation failed',
      code: 'API_KEY_REVOCATION_ERROR'
    });
  }
});

// =============================================================================
// CRUD OPERATIONS FOR SERVERS
// =============================================================================

// In-memory server store (in production, use proper database)
const servers = new Map();

// Create Server
v1Router.post('/servers', [
  authenticateJWT,
  requireRole(['admin', 'manager']),
  body('name').isLength({ min: 1, max: 100 }).trim(),
  body('ip').isIP(),
  body('port').isInt({ min: 1, max: 65535 }),
  body('description').optional().isLength({ max: 500 }).trim(),
  body('environment').optional().isIn(['development', 'staging', 'production']),
  body('tags').optional().isArray(),
  handleValidationErrors
], cache(60), async (req, res) => {
  try {
    const { name, ip, port, description = '', environment = 'production', tags = [] } = req.body;

    // Check for duplicate
    const existingServer = Array.from(servers.values()).find(s => s.name === name || (s.ip === ip && s.port === port));
    if (existingServer) {
      return res.status(409).json({
        success: false,
        error: 'Server already exists',
        code: 'SERVER_EXISTS'
      });
    }

    const serverId = crypto.randomUUID();
    const server = {
      id: serverId,
      name,
      ip,
      port,
      description,
      environment,
      tags,
      status: 'unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.id,
      lastCheck: null,
      metrics: {},
      alerts: []
    };

    servers.set(serverId, server);

    auditLog('SERVER_CREATED', {
      serverId,
      name,
      ip,
      port,
      environment
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Server created successfully',
      data: server
    });

  } catch (error) {
    console.error('Server creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Server creation failed',
      code: 'SERVER_CREATION_ERROR'
    });
  }
});

// Get All Servers
v1Router.get('/servers', [
  authenticateJWT,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('environment').optional().isIn(['development', 'staging', 'production']),
  query('status').optional().isIn(['online', 'offline', 'warning', 'critical', 'unknown']),
  query('search').optional().isLength({ max: 100 }),
  handleValidationErrors
], cache(30), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      environment,
      status,
      search
    } = req.query;

    let serverList = Array.from(servers.values());

    // Apply filters
    if (environment) {
      serverList = serverList.filter(s => s.environment === environment);
    }

    if (status) {
      serverList = serverList.filter(s => s.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      serverList = serverList.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        s.ip.includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const total = serverList.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedServers = serverList.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        servers: paginatedServers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Servers list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve servers',
      code: 'SERVERS_LIST_ERROR'
    });
  }
});

// Get Server by ID
v1Router.get('/servers/:id', [
  authenticateJWT,
  param('id').isUUID(),
  handleValidationErrors
], cache(60), async (req, res) => {
  try {
    const { id } = req.params;
    const server = servers.get(id);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
        code: 'SERVER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: server
    });

  } catch (error) {
    console.error('Server get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve server',
      code: 'SERVER_GET_ERROR'
    });
  }
});

// Update Server
v1Router.put('/servers/:id', [
  authenticateJWT,
  requireRole(['admin', 'manager']),
  param('id').isUUID(),
  body('name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('ip').optional().isIP(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('description').optional().isLength({ max: 500 }).trim(),
  body('environment').optional().isIn(['development', 'staging', 'production']),
  body('tags').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const server = servers.get(id);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
        code: 'SERVER_NOT_FOUND'
      });
    }

    // Update fields
    const updates = {};
    ['name', 'ip', 'port', 'description', 'environment', 'tags'].forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
        server[field] = req.body[field];
      }
    });

    server.updatedAt = new Date().toISOString();

    auditLog('SERVER_UPDATED', {
      serverId: id,
      updates
    }, req.user.id);

    res.json({
      success: true,
      message: 'Server updated successfully',
      data: server
    });

  } catch (error) {
    console.error('Server update error:', error);
    res.status(500).json({
      success: false,
      error: 'Server update failed',
      code: 'SERVER_UPDATE_ERROR'
    });
  }
});

// Delete Server
v1Router.delete('/servers/:id', [
  authenticateJWT,
  requireRole(['admin']),
  param('id').isUUID(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const server = servers.get(id);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
        code: 'SERVER_NOT_FOUND'
      });
    }

    servers.delete(id);

    auditLog('SERVER_DELETED', {
      serverId: id,
      serverName: server.name
    }, req.user.id);

    res.json({
      success: true,
      message: 'Server deleted successfully'
    });

  } catch (error) {
    console.error('Server deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Server deletion failed',
      code: 'SERVER_DELETION_ERROR'
    });
  }
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

// Get API Analytics
v1Router.get('/admin/analytics', [
  authenticateJWT,
  requireRole(['admin']),
  cache(60)
], async (req, res) => {
  try {
    // Calculate average response times
    const avgResponseTimes = {};
    for (const [endpoint, times] of apiAnalytics.responseTimesByEndpoint.entries()) {
      avgResponseTimes[endpoint] = times.reduce((a, b) => a + b, 0) / times.length;
    }

    res.json({
      success: true,
      data: {
        ...apiAnalytics,
        averageResponseTimes: avgResponseTimes,
        uptime: Date.now() - new Date(apiAnalytics.lastReset).getTime()
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

// Get Audit Logs
v1Router.get('/admin/audit-logs', [
  authenticateJWT,
  requireRole(['admin']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isLength({ max: 50 }),
  query('userId').optional().isUUID(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;

    let logs = [...auditLogs];

    // Apply filters
    if (action) {
      logs = logs.filter(log => log.action.includes(action.toUpperCase()));
    }

    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const total = logs.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = logs.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs',
      code: 'AUDIT_LOGS_ERROR'
    });
  }
});

// IP Management
v1Router.post('/admin/ip-whitelist', [
  authenticateJWT,
  requireRole(['admin']),
  body('ip').isIP(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { ip } = req.body;
    ipWhitelist.add(ip);

    auditLog('IP_WHITELISTED', { ip }, req.user.id);

    res.json({
      success: true,
      message: 'IP added to whitelist',
      data: { ip }
    });

  } catch (error) {
    console.error('IP whitelist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add IP to whitelist',
      code: 'IP_WHITELIST_ERROR'
    });
  }
});

v1Router.post('/admin/ip-blacklist', [
  authenticateJWT,
  requireRole(['admin']),
  body('ip').isIP(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { ip } = req.body;
    ipBlacklist.add(ip);

    auditLog('IP_BLACKLISTED', { ip }, req.user.id);

    res.json({
      success: true,
      message: 'IP added to blacklist',
      data: { ip }
    });

  } catch (error) {
    console.error('IP blacklist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add IP to blacklist',
      code: 'IP_BLACKLIST_ERROR'
    });
  }
});

// =============================================================================
// API DOCUMENTATION (OpenAPI/Swagger)
// =============================================================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SAMS Infrastructure Monitoring API',
      version: '1.0.0',
      description: 'Comprehensive RESTful API for SAMS infrastructure monitoring system',
      contact: {
        name: 'SAMS Team',
        email: 'support@sams.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.sams.com/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' }
          }
        },
        Server: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            ip: { type: 'string', format: 'ipv4' },
            port: { type: 'integer' },
            description: { type: 'string' },
            environment: { type: 'string', enum: ['development', 'staging', 'production'] },
            tags: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['online', 'offline', 'warning', 'critical', 'unknown'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { apiKeyAuth: [] }
    ]
  },
  apis: ['./api-framework.js'] // Path to the API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Mount API versions
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SAMS API Documentation'
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'SAMS API Framework',
    version: API_CONFIG.version.current,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version info
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    data: API_CONFIG.version
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('API Error:', error);

  auditLog('API_ERROR', {
    error: error.message,
    stack: error.stack,
    endpoint: req.path,
    method: req.method
  }, req.user?.id);

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
    requestId: req.id
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    requestId: req.id
  });
});

module.exports = {
  app,
  API_CONFIG,
  authenticateJWT,
  authenticateAPIKey,
  requireRole,
  cache,
  auditLog,
  users,
  servers,
  apiKeys,
  sessions,
  auditLogs,
  apiAnalytics
};