import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login endpoint
router.post('/login', 
  authLimiter,
  [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const { username, password } = req.body;
      const db = DatabaseService.getConnection();

      // Find user by username or email
      const user = await db('users')
        .where('username', username)
        .orWhere('email', username)
        .andWhere('status', 'active')
        .first();

      if (!user) {
        logger.warn(`Login attempt with invalid username: ${username}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed attempts'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        // Increment failed attempts
        const failedAttempts = user.failed_login_attempts + 1;
        const updateData: any = { failed_login_attempts: failedAttempts };
        
        // Lock account after 5 failed attempts
        if (failedAttempts >= 5) {
          updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }
        
        await db('users').where('id', user.id).update(updateData);
        
        logger.warn(`Failed login attempt for user: ${username}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Reset failed attempts on successful login
      await db('users').where('id', user.id).update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login: new Date(),
        last_login_ip: req.ip
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Remove sensitive data from user object
      const { password_hash, pin_hash, two_factor_secret, ...safeUser } = user;

      logger.info(`Successful login for user: ${username}`);
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: safeUser
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// PIN validation endpoint
router.post('/validate-pin',
  authLimiter,
  [
    body('pin').isLength({ min: 4, max: 6 }).isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid PIN format'
        });
      }

      const { pin } = req.body;
      const db = DatabaseService.getConnection();

      // For demo purposes, we'll check against a default PIN
      // In production, this should validate against user-specific PINs
      const users = await db('users').where('pin_hash', '!=', null);
      
      for (const user of users) {
        if (user.pin_hash && await bcrypt.compare(pin, user.pin_hash)) {
          logger.info(`Successful PIN validation for user: ${user.username}`);
          return res.json({
            success: true,
            valid: true,
            message: 'PIN is valid'
          });
        }
      }

      // Check default PIN for demo (1234)
      const defaultPinHash = await bcrypt.hash('1234', 10);
      if (await bcrypt.compare(pin, defaultPinHash)) {
        logger.info('Successful PIN validation with default PIN');
        return res.json({
          success: true,
          valid: true,
          message: 'PIN is valid'
        });
      }

      logger.warn(`Invalid PIN attempt: ${pin}`);
      res.json({
        success: true,
        valid: false,
        message: 'Invalid PIN'
      });

    } catch (error) {
      logger.error('PIN validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Register endpoint (admin only)
router.post('/register',
  [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['admin', 'operator', 'viewer']).optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const { username, email, password, role = 'viewer', firstName, lastName } = req.body;
      const db = DatabaseService.getConnection();

      // Check if user already exists
      const existingUser = await db('users')
        .where('username', username)
        .orWhere('email', email)
        .first();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await DatabaseService.create('users', {
        username,
        email,
        password_hash: passwordHash,
        role,
        first_name: firstName,
        last_name: lastName,
        status: 'active'
      });

      // Remove sensitive data
      const { password_hash, pin_hash, ...safeUser } = newUser;

      logger.info(`New user registered: ${username}`);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: safeUser
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify the existing token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Generate new token
    const newToken = jwt.sign(
      { 
        userId: decoded.userId, 
        username: decoded.username, 
        role: decoded.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

export default router;
