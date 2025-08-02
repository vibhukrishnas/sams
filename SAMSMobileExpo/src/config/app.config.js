export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002/api';
export const WS_URL = process.env.WS_URL || 'ws://localhost:5002/ws';

export const APP_CONFIG = {
  // API Configuration
  API_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  
  // WebSocket Configuration
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_INTERVAL: 1000,
  
  // Background Fetch Configuration
  BACKGROUND_FETCH_INTERVAL: 15, // minutes
  
  // Metric Thresholds
  THRESHOLDS: {
    CPU_USAGE: 90, // percentage
    MEMORY_USAGE: 85, // percentage
    DISK_USAGE: 90, // percentage
    NETWORK_LATENCY: 1000, // ms
  },
  
  // Cache Configuration
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  
  // Security
  TOKEN_REFRESH_INTERVAL: 15 * 60 * 1000, // 15 minutes
  
  // Notifications
  NOTIFICATION_CHANNELS: {
    CRITICAL: {
      id: 'critical',
      name: 'Critical Alerts',
      description: 'High priority system alerts',
      importance: 'max',
    },
    WARNING: {
      id: 'warning',
      name: 'Warnings',
      description: 'System warnings and notifications',
      importance: 'high',
    },
  },
};
