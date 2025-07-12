import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

// Mock logger to prevent console spam during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

// Setup test database
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'sams_test_db';
  
  try {
    // Initialize test database
    await DatabaseService.initialize();
  } catch (error) {
    console.error('Failed to setup test database:', error);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await DatabaseService.close();
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clean up test data if needed
  try {
    const db = DatabaseService.getConnection();
    if (db) {
      // Clean up test data
      await db('alerts').del();
      await db('servers').del();
      await db('users').del();
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Global test utilities
global.testUtils = {
  createTestUser: async (overrides = {}) => {
    const db = DatabaseService.getConnection();
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      role: 'admin',
      status: 'active',
      ...overrides
    };
    
    const [user] = await db('users').insert(userData).returning('*');
    return user;
  },
  
  createTestServer: async (overrides = {}) => {
    const db = DatabaseService.getConnection();
    const serverData = {
      name: 'Test Server',
      hostname: 'test.example.com',
      ip_address: '192.168.1.100',
      type: 'web',
      os: 'linux',
      status: 'online',
      ...overrides
    };
    
    const [server] = await db('servers').insert(serverData).returning('*');
    return server;
  },
  
  createTestAlert: async (serverId: string, overrides = {}) => {
    const db = DatabaseService.getConnection();
    const alertData = {
      title: 'Test Alert',
      message: 'This is a test alert',
      severity: 'medium',
      type: 'threshold',
      category: 'performance',
      source: 'test',
      server_id: serverId,
      first_seen: new Date(),
      last_seen: new Date(),
      ...overrides
    };
    
    const [alert] = await db('alerts').insert(alertData).returning('*');
    return alert;
  }
};

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidTimestamp(received) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  }
});

// Type declarations for global utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidTimestamp(): R;
    }
  }
  
  var testUtils: {
    createTestUser: (overrides?: any) => Promise<any>;
    createTestServer: (overrides?: any) => Promise<any>;
    createTestAlert: (serverId: string, overrides?: any) => Promise<any>;
  };
}
