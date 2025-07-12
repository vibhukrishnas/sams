import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import authRoutes from '../routes/auth';
import { DatabaseService } from '../services/DatabaseService';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Authentication Routes', () => {
  let testUser: any;

  beforeEach(async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash('testpassword123', 12);
    testUser = await testUtils.createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: passwordHash,
      role: 'admin',
      status: 'active'
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should login with email instead of username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'test@example.com',
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'testpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate input format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'ab', // too short
          password: '123' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle account lockout after failed attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            username: 'testuser',
            password: 'wrongpassword'
          });
      }

      // 6th attempt should be locked
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(423);
      expect(response.body.message).toContain('locked');
    });
  });

  describe('POST /auth/validate-pin', () => {
    beforeEach(async () => {
      // Set up a user with PIN
      const pinHash = await bcrypt.hash('1234', 10);
      await DatabaseService.update('users', testUser.id, { pin_hash: pinHash });
    });

    it('should validate correct PIN', async () => {
      const response = await request(app)
        .post('/auth/validate-pin')
        .send({
          pin: '1234'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
    });

    it('should reject incorrect PIN', async () => {
      const response = await request(app)
        .post('/auth/validate-pin')
        .send({
          pin: '9999'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(false);
    });

    it('should validate PIN format', async () => {
      const response = await request(app)
        .post('/auth/validate-pin')
        .send({
          pin: 'abc' // non-numeric
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate PIN length', async () => {
      const response = await request(app)
        .post('/auth/validate-pin')
        .send({
          pin: '12' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/register', () => {
    it('should register new user with valid data', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'newpassword123',
          role: 'operator',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('newuser');
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should reject duplicate username', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser', // already exists
          email: 'different@example.com',
          password: 'newpassword123'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already exists');
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'differentuser',
          email: 'test@example.com', // already exists
          password: 'newpassword123'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should validate input format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'ab', // too short
          email: 'invalid-email',
          password: '123' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should default to viewer role', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'vieweruser',
          email: 'viewer@example.com',
          password: 'viewerpassword123'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('viewer');
    });
  });

  describe('POST /auth/refresh', () => {
    let validToken: string;

    beforeEach(async () => {
      // Get a valid token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword123'
        });
      
      validToken = loginResponse.body.token;
    });

    it('should refresh valid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          token: validToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.token).not.toBe(validToken); // Should be a new token
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          token: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // Make multiple requests quickly
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send({
            username: 'testuser',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
