/**
 * 🧪 API Service Tests
 * Comprehensive tests for API service functionality
 */

import ApiService, { AlertApiService, ServerApiService, AuthApiService } from '../ApiService';
import apiServiceFactory from '../ApiServiceFactory';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: {
      baseURL: '',
      timeout: 30000,
    },
  })),
}));

jest.mock('../AuthenticationService', () => ({
  getInstance: jest.fn(() => ({
    getStoredTokens: jest.fn(() => Promise.resolve({ accessToken: 'test-token' })),
    refreshToken: jest.fn(() => Promise.resolve(true)),
    logout: jest.fn(),
  })),
}));

jest.mock('../OfflineManager', () => ({
  getInstance: jest.fn(() => ({
    queueRequest: jest.fn(),
  })),
}));

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = ApiService.getInstance();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ApiService.getInstance();
      const instance2 = ApiService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const config = apiService.getConfig();
      expect(config).toHaveProperty('baseURL');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('retryAttempts');
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
    });

    it('should update configuration', () => {
      const newConfig = { timeout: 60000, retryAttempts: 5 };
      apiService.updateConfig(newConfig);
      const config = apiService.getConfig();
      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
    });
  });

  describe('Network Status', () => {
    it('should track network status', () => {
      expect(typeof apiService.isNetworkOnline()).toBe('boolean');
    });

    it('should manage request queue', () => {
      expect(typeof apiService.getQueuedRequestsCount()).toBe('number');
      apiService.clearRequestQueue();
      expect(apiService.getQueuedRequestsCount()).toBe(0);
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      // Mock successful responses
      const mockAxios = require('axios');
      const mockInstance = mockAxios.create();
      mockInstance.get.mockResolvedValue({ data: { success: true, data: 'test' } });
      mockInstance.post.mockResolvedValue({ data: { success: true, data: 'test' } });
      mockInstance.put.mockResolvedValue({ data: { success: true, data: 'test' } });
      mockInstance.patch.mockResolvedValue({ data: { success: true, data: 'test' } });
      mockInstance.delete.mockResolvedValue({ data: { success: true, data: 'test' } });
    });

    it('should make GET requests', async () => {
      const response = await apiService.get('/test');
      expect(response.success).toBe(true);
    });

    it('should make POST requests', async () => {
      const response = await apiService.post('/test', { data: 'test' });
      expect(response.success).toBe(true);
    });

    it('should make PUT requests', async () => {
      const response = await apiService.put('/test', { data: 'test' });
      expect(response.success).toBe(true);
    });

    it('should make PATCH requests', async () => {
      const response = await apiService.patch('/test', { data: 'test' });
      expect(response.success).toBe(true);
    });

    it('should make DELETE requests', async () => {
      const response = await apiService.delete('/test');
      expect(response.success).toBe(true);
    });
  });
});

describe('AlertApiService', () => {
  let alertService: AlertApiService;

  beforeEach(() => {
    alertService = new AlertApiService();
  });

  it('should get alerts', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'get').mockResolvedValue({ success: true, data: [] });

    await alertService.getAlerts();
    expect(mockApiService.get).toHaveBeenCalledWith('/alerts');
  });

  it('should get alerts with parameters', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'get').mockResolvedValue({ success: true, data: [] });

    await alertService.getAlerts({ severity: 'critical', acknowledged: false });
    expect(mockApiService.get).toHaveBeenCalledWith('/alerts?severity=critical&acknowledged=false');
  });

  it('should acknowledge alert', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'post').mockResolvedValue({ success: true });

    await alertService.acknowledgeAlert('123', 'Test note');
    expect(mockApiService.post).toHaveBeenCalledWith('/alerts/123/acknowledge', { notes: 'Test note' });
  });

  it('should trigger emergency SOS', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'post').mockResolvedValue({ success: true });

    const sosData = { message: 'Emergency', location: { lat: 40.7128, lng: -74.0060 } };
    await alertService.triggerEmergencySOS(sosData);
    expect(mockApiService.post).toHaveBeenCalledWith('/emergency/sos', sosData);
  });
});

describe('ServerApiService', () => {
  let serverService: ServerApiService;

  beforeEach(() => {
    serverService = new ServerApiService();
  });

  it('should get servers', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'get').mockResolvedValue({ success: true, data: [] });

    await serverService.getServers();
    expect(mockApiService.get).toHaveBeenCalledWith('/servers');
  });

  it('should add server', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'post').mockResolvedValue({ success: true });

    const serverData = { name: 'Test Server', ip: '192.168.1.100' };
    await serverService.addServer(serverData);
    expect(mockApiService.post).toHaveBeenCalledWith('/servers', serverData);
  });

  it('should test connection', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'post').mockResolvedValue({ success: true });

    await serverService.testConnection('123');
    expect(mockApiService.post).toHaveBeenCalledWith('/servers/123/test');
  });

  it('should deploy agent', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'post').mockResolvedValue({ success: true });

    await serverService.deployAgent('123');
    expect(mockApiService.post).toHaveBeenCalledWith('/servers/123/deploy-agent');
  });
});

describe('AuthApiService', () => {
  let authService: AuthApiService;

  beforeEach(() => {
    authService = new AuthApiService();
  });

  it('should login with username and password', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'post').mockResolvedValue({ success: true });

    const credentials = { username: 'admin', password: 'password123' };
    await authService.login(credentials);
    expect(mockApiService.post).toHaveBeenCalledWith('/auth/login', credentials);
  });

  it('should login with PIN', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'post').mockResolvedValue({ success: true });

    const credentials = { username: 'admin', pin: '1234' };
    await authService.login(credentials);
    expect(mockApiService.post).toHaveBeenCalledWith('/auth/login', credentials);
  });

  it('should refresh token', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'post').mockResolvedValue({ success: true });

    await authService.refreshToken('refresh-token');
    expect(mockApiService.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-token' });
  });

  it('should get current user', async () => {
    const mockApiService = ApiService.getInstance();
    jest.spyOn(mockApiService, 'get').mockResolvedValue({ success: true });

    await authService.getCurrentUser();
    expect(mockApiService.get).toHaveBeenCalledWith('/auth/me');
  });
});

describe('ApiServiceFactory', () => {
  it('should provide access to all services', () => {
    expect(apiServiceFactory.getApiService()).toBeInstanceOf(ApiService);
    expect(apiServiceFactory.getAlertService()).toBeInstanceOf(AlertApiService);
    expect(apiServiceFactory.getServerService()).toBeInstanceOf(ServerApiService);
    expect(apiServiceFactory.getAuthService()).toBeInstanceOf(AuthApiService);
  });

  it('should provide convenience methods', () => {
    expect(typeof apiServiceFactory.isOnline()).toBe('boolean');
    expect(typeof apiServiceFactory.getQueuedRequestsCount()).toBe('number');
  });
});
