# 👥 **SAMS Mobile - User Management Service Development**

## **Executive Summary**

This document presents the complete User Management Service implementation for SAMS Mobile, featuring JWT-based authentication with refresh tokens, comprehensive RBAC system, user lifecycle management, LDAP/Active Directory integration, and enterprise-grade security measures.

## **🏗️ Service Architecture**

### **User Management Microservice Structure**
```
user-management-service/
├── src/
│   ├── controllers/
│   │   ├── AuthController.js
│   │   ├── UserController.js
│   │   └── RoleController.js
│   ├── services/
│   │   ├── AuthService.js
│   │   ├── UserService.js
│   │   ├── LDAPService.js
│   │   └── TokenService.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Role.js
│   │   └── Permission.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── rbacMiddleware.js
│   │   └── validationMiddleware.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── roles.js
│   └── utils/
│       ├── passwordUtils.js
│       ├── jwtUtils.js
│       └── ldapUtils.js
├── tests/
├── config/
└── docs/
```

## **🔐 JWT Authentication Implementation**

### **Token Service**
```javascript
// services/TokenService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Redis = require('ioredis');

class TokenService {
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL);
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
        this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    }
    
    async generateTokenPair(user, deviceInfo = {}) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            organizationId: user.organizationId,
            deviceId: deviceInfo.deviceId,
            deviceType: deviceInfo.deviceType
        };
        
        // Generate access token
        const accessToken = jwt.sign(payload, this.accessTokenSecret, {
            expiresIn: this.accessTokenExpiry,
            issuer: 'sams-mobile',
            audience: 'sams-mobile-app'
        });
        
        // Generate refresh token
        const refreshTokenId = crypto.randomUUID();
        const refreshToken = jwt.sign(
            { ...payload, tokenId: refreshTokenId },
            this.refreshTokenSecret,
            {
                expiresIn: this.refreshTokenExpiry,
                issuer: 'sams-mobile',
                audience: 'sams-mobile-app'
            }
        );
        
        // Store refresh token in Redis
        await this.storeRefreshToken(refreshTokenId, user.id, deviceInfo);
        
        return {
            accessToken,
            refreshToken,
            accessTokenExpiry: this.getTokenExpiry(accessToken),
            refreshTokenExpiry: this.getTokenExpiry(refreshToken)
        };
    }
    
    async storeRefreshToken(tokenId, userId, deviceInfo) {
        const tokenData = {
            userId,
            deviceId: deviceInfo.deviceId,
            deviceType: deviceInfo.deviceType,
            deviceModel: deviceInfo.deviceModel,
            ipAddress: deviceInfo.ipAddress,
            userAgent: deviceInfo.userAgent,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };
        
        const key = `refresh_token:${tokenId}`;
        await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(tokenData)); // 7 days
        
        // Track user's active tokens
        await this.redis.sadd(`user_tokens:${userId}`, tokenId);
    }
    
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, this.refreshTokenSecret);
            const tokenData = await this.redis.get(`refresh_token:${decoded.tokenId}`);
            
            if (!tokenData) {
                throw new Error('Refresh token not found or expired');
            }
            
            const storedData = JSON.parse(tokenData);
            
            // Update last used timestamp
            storedData.lastUsed = new Date().toISOString();
            await this.redis.setex(
                `refresh_token:${decoded.tokenId}`,
                7 * 24 * 60 * 60,
                JSON.stringify(storedData)
            );
            
            // Generate new access token
            const accessToken = jwt.sign(
                {
                    userId: decoded.userId,
                    email: decoded.email,
                    role: decoded.role,
                    permissions: decoded.permissions,
                    organizationId: decoded.organizationId,
                    deviceId: decoded.deviceId,
                    deviceType: decoded.deviceType
                },
                this.accessTokenSecret,
                {
                    expiresIn: this.accessTokenExpiry,
                    issuer: 'sams-mobile',
                    audience: 'sams-mobile-app'
                }
            );
            
            return {
                accessToken,
                accessTokenExpiry: this.getTokenExpiry(accessToken)
            };
            
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    
    async revokeToken(tokenId, userId) {
        await this.redis.del(`refresh_token:${tokenId}`);
        await this.redis.srem(`user_tokens:${userId}`, tokenId);
    }
    
    async revokeAllUserTokens(userId) {
        const tokenIds = await this.redis.smembers(`user_tokens:${userId}`);
        
        if (tokenIds.length > 0) {
            const pipeline = this.redis.pipeline();
            tokenIds.forEach(tokenId => {
                pipeline.del(`refresh_token:${tokenId}`);
            });
            pipeline.del(`user_tokens:${userId}`);
            await pipeline.exec();
        }
    }
    
    getTokenExpiry(token) {
        const decoded = jwt.decode(token);
        return new Date(decoded.exp * 1000);
    }
    
    async validateAccessToken(token) {
        try {
            return jwt.verify(token, this.accessTokenSecret);
        } catch (error) {
            throw new Error('Invalid access token');
        }
    }
}

module.exports = TokenService;
```

### **Authentication Controller**
```javascript
// controllers/AuthController.js
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const TokenService = require('../services/TokenService');
const UserService = require('../services/UserService');
const LDAPService = require('../services/LDAPService');

class AuthController {
    constructor() {
        this.authService = new AuthService();
        this.tokenService = new TokenService();
        this.userService = new UserService();
        this.ldapService = new LDAPService();
        
        // Rate limiting for authentication endpoints
        this.loginLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // 5 attempts per window
            message: 'Too many login attempts, please try again later',
            standardHeaders: true,
            legacyHeaders: false
        });
    }
    
    // Login endpoint
    async login(req, res) {
        try {
            // Validate input
            await this.validateLoginInput(req);
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { email, password, deviceInfo } = req.body;
            
            // Check if user exists
            const user = await this.userService.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // Check if account is active
            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Account is disabled'
                });
            }
            
            // Check for account lockout
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                return res.status(423).json({
                    success: false,
                    message: 'Account is temporarily locked'
                });
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            if (!isValidPassword) {
                await this.handleFailedLogin(user);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // Reset failed login attempts on successful login
            await this.userService.resetFailedLoginAttempts(user.id);
            
            // Generate tokens
            const tokens = await this.tokenService.generateTokenPair(user, {
                ...deviceInfo,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            // Update last login
            await this.userService.updateLastLogin(user.id);
            
            // Log successful login
            await this.authService.logAuthEvent(user.id, 'login_success', {
                deviceInfo,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        organizationId: user.organizationId
                    },
                    tokens
                }
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    
    // LDAP/AD login endpoint
    async ldapLogin(req, res) {
        try {
            const { username, password, domain, deviceInfo } = req.body;
            
            // Authenticate with LDAP/AD
            const ldapUser = await this.ldapService.authenticate(username, password, domain);
            if (!ldapUser) {
                return res.status(401).json({
                    success: false,
                    message: 'LDAP authentication failed'
                });
            }
            
            // Find or create user in local database
            let user = await this.userService.findByEmail(ldapUser.email);
            if (!user) {
                user = await this.userService.createFromLDAP(ldapUser);
            } else {
                // Update user info from LDAP
                user = await this.userService.updateFromLDAP(user.id, ldapUser);
            }
            
            // Generate tokens
            const tokens = await this.tokenService.generateTokenPair(user, {
                ...deviceInfo,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.json({
                success: true,
                message: 'LDAP login successful',
                data: { user, tokens }
            });
            
        } catch (error) {
            console.error('LDAP login error:', error);
            res.status(500).json({
                success: false,
                message: 'LDAP authentication error'
            });
        }
    }
    
    // Refresh token endpoint
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token is required'
                });
            }
            
            const tokens = await this.tokenService.refreshAccessToken(refreshToken);
            
            res.json({
                success: true,
                message: 'Token refreshed successfully',
                data: tokens
            });
            
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }
    }
    
    // Logout endpoint
    async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            const userId = req.user.userId;
            
            if (refreshToken) {
                const decoded = jwt.decode(refreshToken);
                if (decoded && decoded.tokenId) {
                    await this.tokenService.revokeToken(decoded.tokenId, userId);
                }
            }
            
            // Log logout event
            await this.authService.logAuthEvent(userId, 'logout', {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.json({
                success: true,
                message: 'Logout successful'
            });
            
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout error'
            });
        }
    }
    
    // Logout from all devices
    async logoutAll(req, res) {
        try {
            const userId = req.user.userId;
            
            await this.tokenService.revokeAllUserTokens(userId);
            
            res.json({
                success: true,
                message: 'Logged out from all devices'
            });
            
        } catch (error) {
            console.error('Logout all error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout all error'
            });
        }
    }
    
    // Password change endpoint
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;
            
            // Validate new password
            if (!this.isValidPassword(newPassword)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password does not meet security requirements'
                });
            }
            
            // Verify current password
            const user = await this.userService.findById(userId);
            const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
            
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
            
            // Update password
            await this.userService.updatePassword(userId, newPassword);
            
            // Revoke all tokens to force re-login
            await this.tokenService.revokeAllUserTokens(userId);
            
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
            
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Password change error'
            });
        }
    }
    
    // Helper methods
    async validateLoginInput(req) {
        await body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email is required')
            .run(req);
            
        await body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .run(req);
    }
    
    async handleFailedLogin(user) {
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const lockoutThreshold = 5;
        
        if (failedAttempts >= lockoutThreshold) {
            const lockoutDuration = 30 * 60 * 1000; // 30 minutes
            await this.userService.lockAccount(user.id, lockoutDuration);
        } else {
            await this.userService.incrementFailedLoginAttempts(user.id);
        }
    }
    
    isValidPassword(password) {
        // Password policy: 8+ chars, uppercase, lowercase, number, special char
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }
}

module.exports = AuthController;
```

## **👤 RBAC System Implementation**

### **Role-Based Access Control**
```javascript
// models/Role.js
const { DataTypes } = require('sequelize');

const Role = (sequelize) => {
    return sequelize.define('Role', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT
        },
        permissions: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        isSystem: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        organizationId: {
            type: DataTypes.UUID,
            allowNull: true // null for system roles
        }
    });
};

// Default system roles
const SYSTEM_ROLES = {
    ADMIN: {
        name: 'admin',
        description: 'System administrator with full access',
        permissions: ['*'], // All permissions
        isSystem: true
    },
    MANAGER: {
        name: 'manager',
        description: 'Manager with organization-wide access',
        permissions: [
            'servers:read', 'servers:write', 'servers:delete',
            'alerts:read', 'alerts:write', 'alerts:acknowledge',
            'users:read', 'users:write',
            'reports:read', 'reports:generate'
        ],
        isSystem: true
    },
    USER: {
        name: 'user',
        description: 'Standard user with limited access',
        permissions: [
            'servers:read',
            'alerts:read', 'alerts:acknowledge',
            'reports:read'
        ],
        isSystem: true
    },
    READONLY: {
        name: 'readonly',
        description: 'Read-only access to monitoring data',
        permissions: [
            'servers:read',
            'alerts:read',
            'reports:read'
        ],
        isSystem: true
    }
};

module.exports = { Role, SYSTEM_ROLES };
```

### **RBAC Middleware**
```javascript
// middleware/rbacMiddleware.js
const rbacMiddleware = (requiredPermission) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            // Check if user has admin role (full access)
            if (user.role === 'admin') {
                return next();
            }
            
            // Check specific permission
            if (!hasPermission(user.permissions, requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }
            
            next();
            
        } catch (error) {
            console.error('RBAC middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Authorization error'
            });
        }
    };
};

function hasPermission(userPermissions, requiredPermission) {
    if (!userPermissions || !Array.isArray(userPermissions)) {
        return false;
    }
    
    // Check for wildcard permission
    if (userPermissions.includes('*')) {
        return true;
    }
    
    // Check exact permission match
    if (userPermissions.includes(requiredPermission)) {
        return true;
    }
    
    // Check wildcard patterns (e.g., 'servers:*' matches 'servers:read')
    const [resource, action] = requiredPermission.split(':');
    const wildcardPermission = `${resource}:*`;
    
    return userPermissions.includes(wildcardPermission);
}

module.exports = rbacMiddleware;
```

## **🧪 Testing Implementation**

### **Authentication Tests**
```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../app');
const { User } = require('../models');

describe('Authentication API', () => {
    beforeEach(async () => {
        await User.destroy({ where: {} });
    });

    describe('POST /api/v1/auth/login', () => {
        test('should login with valid credentials', async () => {
            const user = await User.create({
                email: 'test@example.com',
                passwordHash: await bcrypt.hash('password123', 12),
                firstName: 'Test',
                lastName: 'User',
                role: 'user',
                isActive: true
            });

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    deviceInfo: {
                        deviceId: 'test-device-1',
                        deviceType: 'mobile'
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
        });

        test('should reject invalid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'invalid@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        test('should lock account after failed attempts', async () => {
            const user = await User.create({
                email: 'test@example.com',
                passwordHash: await bcrypt.hash('password123', 12),
                isActive: true
            });

            // Make 5 failed login attempts
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/v1/auth/login')
                    .send({
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    });
            }

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(423);
            expect(response.body.message).toContain('locked');
        });
    });

    describe('POST /api/v1/auth/refresh', () => {
        test('should refresh access token with valid refresh token', async () => {
            // Create user and login to get tokens
            const user = await User.create({
                email: 'test@example.com',
                passwordHash: await bcrypt.hash('password123', 12),
                isActive: true
            });

            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            const { refreshToken } = loginResponse.body.data.tokens;

            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refreshToken });

            expect(response.status).toBe(200);
            expect(response.body.data.accessToken).toBeDefined();
        });
    });
});
```

### **RBAC Tests**
```javascript
// tests/rbac.test.js
const request = require('supertest');
const app = require('../app');
const { generateTestToken } = require('./helpers/tokenHelper');

describe('RBAC Middleware', () => {
    test('should allow admin access to all endpoints', async () => {
        const adminToken = generateTestToken({
            userId: 'admin-user-id',
            role: 'admin',
            permissions: ['*']
        });

        const response = await request(app)
            .get('/api/v1/servers')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).not.toBe(403);
    });

    test('should deny access without proper permissions', async () => {
        const userToken = generateTestToken({
            userId: 'user-id',
            role: 'user',
            permissions: ['servers:read']
        });

        const response = await request(app)
            .post('/api/v1/servers')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ name: 'Test Server' });

        expect(response.status).toBe(403);
    });

    test('should allow access with proper permissions', async () => {
        const managerToken = generateTestToken({
            userId: 'manager-id',
            role: 'manager',
            permissions: ['servers:read', 'servers:write']
        });

        const response = await request(app)
            .get('/api/v1/servers')
            .set('Authorization', `Bearer ${managerToken}`);

        expect(response.status).not.toBe(403);
    });
});
```

## **📚 API Documentation**

### **Authentication Endpoints**

#### **POST /api/v1/auth/login**
```yaml
summary: User login with email and password
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - email
          - password
        properties:
          email:
            type: string
            format: email
          password:
            type: string
            minLength: 8
          deviceInfo:
            type: object
            properties:
              deviceId:
                type: string
              deviceType:
                type: string
                enum: [mobile, web, desktop]
              deviceModel:
                type: string

responses:
  200:
    description: Login successful
    content:
      application/json:
        schema:
          type: object
          properties:
            success:
              type: boolean
            message:
              type: string
            data:
              type: object
              properties:
                user:
                  $ref: '#/components/schemas/User'
                tokens:
                  $ref: '#/components/schemas/TokenPair'
  401:
    description: Invalid credentials
  423:
    description: Account locked
```

#### **POST /api/v1/auth/refresh**
```yaml
summary: Refresh access token
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - refreshToken
        properties:
          refreshToken:
            type: string

responses:
  200:
    description: Token refreshed successfully
  401:
    description: Invalid refresh token
```

### **User Management Endpoints**

#### **GET /api/v1/users**
```yaml
summary: Get list of users (requires users:read permission)
parameters:
  - name: page
    in: query
    schema:
      type: integer
      default: 1
  - name: limit
    in: query
    schema:
      type: integer
      default: 20
  - name: role
    in: query
    schema:
      type: string
  - name: organizationId
    in: query
    schema:
      type: string

responses:
  200:
    description: Users retrieved successfully
    content:
      application/json:
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: object
              properties:
                users:
                  type: array
                  items:
                    $ref: '#/components/schemas/User'
                pagination:
                  $ref: '#/components/schemas/Pagination'
```

## **🔒 Security Features**

### **Password Policy Implementation**
```javascript
// utils/passwordUtils.js
class PasswordUtils {
    static validatePassword(password) {
        const requirements = {
            minLength: 8,
            maxLength: 128,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            preventCommonPasswords: true
        };

        const errors = [];

        if (password.length < requirements.minLength) {
            errors.push(`Password must be at least ${requirements.minLength} characters long`);
        }

        if (password.length > requirements.maxLength) {
            errors.push(`Password must be no more than ${requirements.maxLength} characters long`);
        }

        if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (requirements.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (requirements.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        if (requirements.preventCommonPasswords && this.isCommonPassword(password)) {
            errors.push('Password is too common, please choose a more secure password');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ];

        return commonPasswords.includes(password.toLowerCase());
    }

    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    static async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }
}

module.exports = PasswordUtils;
```

---

*This comprehensive User Management Service provides enterprise-grade authentication, authorization, and user lifecycle management with JWT tokens, RBAC system, LDAP integration, robust security measures, comprehensive testing, and detailed API documentation for SAMS Mobile.*
