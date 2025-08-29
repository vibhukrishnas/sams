import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api/v1', // This will be proxied to localhost:8080/api/v1
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints
export const apiService = {
  // System metrics
  getSystemMetrics: () => api.get('/system/metrics'),
  
  // Server management
  getServers: (page = 0, size = 10) => 
    api.get(`/servers?page=${page}&size=${size}`),
  
  getServerById: (id: string) => api.get(`/servers/${id}`),
  
  createServer: (server: any) => api.post('/servers', server),
  
  updateServer: (id: string, server: any) => 
    api.put(`/servers/${id}`, server),
  
  deleteServer: (id: string) => api.delete(`/servers/${id}`),
  
  // Server metrics
  getServerMetrics: (id: string) => api.get(`/servers/${id}/metrics`),
  
  // System status
  getSystemStatus: () => api.get('/status'),
  
  // Health check
  getHealthStatus: () => api.get('/health/status', { baseURL: '/api' }),
  
  // Alerts
  getAlerts: () => api.get('/alerts'),
  
  // CPU, Memory, Disk metrics
  getCpuMetrics: () => api.get('/cpu'),
  getMemoryMetrics: () => api.get('/memory'),
  getDiskMetrics: () => api.get('/disk'),
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
