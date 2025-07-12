/**
 * 🌐 API Service - Centralized HTTP Client
 * Enterprise-grade API service with authentication, retry, and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import AuthenticationService from './AuthenticationService';
import OfflineManager from './OfflineManager';

interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableOfflineQueue: boolean;
  enableRequestLogging: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

interface RequestQueueItem {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
  retryCount: number;
}

class ApiService {
  private static instance: ApiService;
  private axiosInstance: AxiosInstance;
  private config: ApiConfig;
  private requestQueue: RequestQueueItem[] = [];
  private isOnline = true;
  private authService: AuthenticationService;
  private offlineManager: OfflineManager;

  constructor() {
    this.config = {
      baseURL: this.getBaseURL(),
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      enableOfflineQueue: true,
      enableRequestLogging: __DEV__,
    };

    this.authService = AuthenticationService.getInstance();
    this.offlineManager = OfflineManager.getInstance();
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
    this.setupNetworkListener();
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private getBaseURL(): string {
    if (__DEV__) {
      return Platform.OS === 'android' 
        ? 'http://10.0.2.2:8080/api/v1' 
        : 'http://localhost:8080/api/v1';
    }
    return 'http://192.168.1.10:8080/api/v1';
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '2.1.0',
        'X-Platform': Platform.OS,
        'X-App-Version': '1.0.0',
      },
    });

    return instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add authentication token
        const tokens = await this.authService.getStoredTokens();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Log request in development
        if (this.config.enableRequestLogging) {
          console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        console.error('🌐 Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log response in development
        if (this.config.enableRequestLogging) {
          console.log(`🌐 API Response: ${response.status} ${response.config.url}`, {
            data: response.data,
          });
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshed = await this.authService.refreshToken();
            if (refreshed) {
              const tokens = await this.authService.getStoredTokens();
              if (tokens?.accessToken) {
                originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
                return this.axiosInstance(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error('🌐 Token refresh failed:', refreshError);
            await this.authService.logout();
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors with retry
        if (this.shouldRetry(error) && !originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        if (originalRequest._retryCount < this.config.retryAttempts) {
          originalRequest._retryCount++;
          
          const delay = this.config.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
          await this.delay(delay);
          
          console.log(`🔄 Retrying request (${originalRequest._retryCount}/${this.config.retryAttempts})`);
          return this.axiosInstance(originalRequest);
        }

        // Queue request if offline
        if (!this.isOnline && this.config.enableOfflineQueue) {
          return this.queueRequest(originalRequest);
        }

        console.error('🌐 API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        console.log('🌐 Network restored, processing queued requests');
        this.processRequestQueue();
      }
    });
  }

  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      !error.response ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ECONNABORTED' ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  }

  private async queueRequest(config: AxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        config,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Store in offline manager for persistence
      this.offlineManager.queueRequest({
        url: config.url || '',
        method: config.method || 'GET',
        data: config.data,
        headers: config.headers,
        timestamp: Date.now(),
      });
    });
  }

  private async processRequestQueue(): Promise<void> {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const item of queue) {
      try {
        const response = await this.axiosInstance(item.config);
        item.resolve(response);
      } catch (error) {
        if (item.retryCount < this.config.retryAttempts) {
          item.retryCount++;
          this.requestQueue.push(item);
        } else {
          item.reject(error);
        }
      }
    }
  }

  private normalizeError(error: AxiosError): ApiResponse {
    const response = error.response;
    
    return {
      success: false,
      error: response?.data?.error || error.message || 'Network error',
      message: response?.data?.message || 'An error occurred',
      timestamp: new Date().toISOString(),
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get(url, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.normalizeError(error as AxiosError);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post(url, data, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.normalizeError(error as AxiosError);
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put(url, data, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.normalizeError(error as AxiosError);
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch(url, data, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.normalizeError(error as AxiosError);
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete(url, config);
      return this.normalizeResponse(response);
    } catch (error) {
      throw this.normalizeError(error as AxiosError);
    }
  }

  private normalizeResponse<T>(response: AxiosResponse): ApiResponse<T> {
    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message || 'Success',
      timestamp: new Date().toISOString(),
    };
  }

  // Configuration methods
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.baseURL) {
      this.axiosInstance.defaults.baseURL = newConfig.baseURL;
    }
    
    if (newConfig.timeout) {
      this.axiosInstance.defaults.timeout = newConfig.timeout;
    }
  }

  getConfig(): ApiConfig {
    return { ...this.config };
  }

  // Network status
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  getQueuedRequestsCount(): number {
    return this.requestQueue.length;
  }

  clearRequestQueue(): void {
    this.requestQueue.forEach(item => {
      item.reject(new Error('Request queue cleared'));
    });
    this.requestQueue = [];
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Specific API Services
export class AlertApiService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async getAlerts(params?: { severity?: string; acknowledged?: boolean; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.acknowledged !== undefined) queryParams.append('acknowledged', params.acknowledged.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/alerts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.apiService.get(url);
  }

  async getAlert(id: string) {
    return this.apiService.get(`/alerts/${id}`);
  }

  async acknowledgeAlert(id: string, notes?: string) {
    return this.apiService.post(`/alerts/${id}/acknowledge`, { notes });
  }

  async resolveAlert(id: string, resolution?: string) {
    return this.apiService.post(`/alerts/${id}/resolve`, { resolution });
  }

  async snoozeAlert(id: string, duration: number) {
    return this.apiService.post(`/alerts/${id}/snooze`, { duration });
  }

  async createAlert(alert: any) {
    return this.apiService.post('/alerts', alert);
  }

  async triggerEmergencySOS(data: { message?: string; location?: any }) {
    return this.apiService.post('/emergency/sos', data);
  }
}

export class ServerApiService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async getServers() {
    return this.apiService.get('/servers');
  }

  async getServer(id: string) {
    return this.apiService.get(`/servers/${id}`);
  }

  async addServer(server: any) {
    return this.apiService.post('/servers', server);
  }

  async updateServer(id: string, server: any) {
    return this.apiService.put(`/servers/${id}`, server);
  }

  async deleteServer(id: string) {
    return this.apiService.delete(`/servers/${id}`);
  }

  async testConnection(id: string) {
    return this.apiService.post(`/servers/${id}/test`);
  }

  async deployAgent(id: string) {
    return this.apiService.post(`/servers/${id}/deploy-agent`);
  }

  async getServerMetrics(id: string, timeRange?: string) {
    const url = `/servers/${id}/metrics${timeRange ? `?range=${timeRange}` : ''}`;
    return this.apiService.get(url);
  }
}

export class AuthApiService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async login(credentials: { username: string; password?: string; pin?: string }) {
    return this.apiService.post('/auth/login', credentials);
  }

  async logout(refreshToken?: string) {
    return this.apiService.post('/auth/logout', { refreshToken });
  }

  async refreshToken(refreshToken: string) {
    return this.apiService.post('/auth/refresh', { refreshToken });
  }

  async getCurrentUser() {
    return this.apiService.get('/auth/me');
  }
}

export class DashboardApiService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async getDashboardData() {
    return this.apiService.get('/dashboard');
  }

  async getSystemHealth() {
    return this.apiService.get('/system/health');
  }

  async getQuickStats() {
    return this.apiService.get('/dashboard/stats');
  }
}

export class VoiceApiService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async processVoiceCommand(data: { transcript: string; confidence: number; language?: string }) {
    return this.apiService.post('/voice/command', data);
  }
}

export class ReportsApiService {
  private apiService: ApiService;

  constructor() {
    this.apiService = ApiService.getInstance();
  }

  async generateReport(type: string, params: any) {
    return this.apiService.post('/reports/generate', { type, ...params });
  }

  async getReports() {
    return this.apiService.get('/reports');
  }

  async downloadReport(id: string) {
    return this.apiService.get(`/reports/${id}/download`);
  }
}

export default ApiService;
export { ApiConfig, ApiResponse };
