export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout'
  },
  SYSTEM: {
    HEALTH: '/health',
    INFO: '/info',
    SYSTEM: '/system',
    CPU: '/system/cpu',
    MEMORY: '/system/memory',
    DISK: '/system/disk',
    NETWORK: '/system/network'
  },
  MONITORING: {
    OVERVIEW: '/monitoring',
    ALERTS: '/alerts',
    ACKNOWLEDGE_ALERT: '/alerts/{id}/acknowledge',
    CLEAR_ALERTS: '/alerts'
  },
  WEBSOCKET: {
    CONNECT: '/ws/metrics'
  }
};
