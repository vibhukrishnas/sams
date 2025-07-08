import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  LOGIN_ATTEMPTS: 'loginAttempts',
  LOCKOUT_TIME: 'lockoutTime',
  SERVER_LIST: 'serverList',
  ALERTS: 'alerts',
  SETTINGS: 'settings',
  COMMANDS: 'commands',
  REPORTS: 'reports',
};

// Generic storage functions
export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error('Error storing data:', error);
    return false;
  }
};

export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error getting data:', error);
    return null;
  }
};

export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing data:', error);
    return false;
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

// Auth-specific storage functions
export const storeAuthToken = async (token) => {
  return await storeData(STORAGE_KEYS.AUTH_TOKEN, token);
};

export const getAuthToken = async () => {
  return await getData(STORAGE_KEYS.AUTH_TOKEN);
};

export const storeUserData = async (userData) => {
  return await storeData(STORAGE_KEYS.USER_DATA, userData);
};

export const getUserData = async () => {
  return await getData(STORAGE_KEYS.USER_DATA);
};

export const clearAuthData = async () => {
  const promises = [
    removeData(STORAGE_KEYS.AUTH_TOKEN),
    removeData(STORAGE_KEYS.USER_DATA),
    removeData(STORAGE_KEYS.LOGIN_ATTEMPTS),
    removeData(STORAGE_KEYS.LOCKOUT_TIME),
  ];
  await Promise.all(promises);
};

// Server management storage functions
export const storeServerList = async (servers) => {
  return await storeData(STORAGE_KEYS.SERVER_LIST, servers);
};

export const getServerList = async () => {
  return await getData(STORAGE_KEYS.SERVER_LIST) || [];
};

export const addServer = async (server) => {
  const servers = await getServerList();
  servers.push(server);
  return await storeServerList(servers);
};

export const updateServer = async (serverId, updatedServer) => {
  const servers = await getServerList();
  const index = servers.findIndex(server => server.id === serverId);
  if (index !== -1) {
    servers[index] = updatedServer;
    return await storeServerList(servers);
  }
  return false;
};

export const removeServer = async (serverId) => {
  const servers = await getServerList();
  const filteredServers = servers.filter(server => server.id !== serverId);
  return await storeServerList(filteredServers);
};

// Alerts storage functions
export const storeAlerts = async (alerts) => {
  return await storeData(STORAGE_KEYS.ALERTS, alerts);
};

export const getAlerts = async () => {
  return await getData(STORAGE_KEYS.ALERTS) || [];
};

export const addAlert = async (alert) => {
  const alerts = await getAlerts();
  alerts.unshift(alert); // Add to beginning
  return await storeAlerts(alerts);
};

export const markAlertAsRead = async (alertId) => {
  const alerts = await getAlerts();
  const index = alerts.findIndex(alert => alert.id === alertId);
  if (index !== -1) {
    alerts[index].read = true;
    return await storeAlerts(alerts);
  }
  return false;
};

// Settings storage functions
export const storeSettings = async (settings) => {
  return await storeData(STORAGE_KEYS.SETTINGS, settings);
};

export const getSettings = async () => {
  return await getData(STORAGE_KEYS.SETTINGS) || getDefaultSettings();
};

export const getDefaultSettings = () => ({
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  refreshInterval: 30, // seconds
  theme: 'light',
  language: 'en',
});

// Commands storage functions
export const storeCommands = async (commands) => {
  return await storeData(STORAGE_KEYS.COMMANDS, commands);
};

export const getCommands = async () => {
  return await getData(STORAGE_KEYS.COMMANDS) || [];
};

export const addCommand = async (command) => {
  const commands = await getCommands();
  commands.push(command);
  return await storeCommands(commands);
};

// Reports storage functions
export const storeReports = async (reports) => {
  return await storeData(STORAGE_KEYS.REPORTS, reports);
};

export const getReports = async () => {
  return await getData(STORAGE_KEYS.REPORTS) || [];
};

export const addReport = async (report) => {
  const reports = await getReports();
  reports.unshift(report);
  return await storeReports(reports);
};

// Initialize sample data for demo purposes
export const initializeSampleData = async () => {
  try {
    // Check if data already exists
    const existingServers = await getServerList();
    const existingAlerts = await getAlerts();

    // Only initialize if no data exists
    if (existingServers.length === 0) {
      const sampleServers = [
        {
          id: '1',
          name: 'Web Server 01',
          host: '192.168.1.10',
          port: 80,
          type: 'web',
          status: 'online',
          lastCheck: new Date().toISOString(),
          uptime: '99.9%',
          responseTime: '45ms',
        },
        {
          id: '2',
          name: 'Database Server',
          host: '192.168.1.20',
          port: 3306,
          type: 'database',
          status: 'online',
          lastCheck: new Date().toISOString(),
          uptime: '99.8%',
          responseTime: '12ms',
        },
        {
          id: '3',
          name: 'API Gateway',
          host: '192.168.1.30',
          port: 8080,
          type: 'api',
          status: 'warning',
          lastCheck: new Date().toISOString(),
          uptime: '98.5%',
          responseTime: '120ms',
        },
        {
          id: '4',
          name: 'File Server',
          host: '192.168.1.40',
          port: 21,
          type: 'file',
          status: 'offline',
          lastCheck: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          uptime: '95.2%',
          responseTime: 'N/A',
        },
      ];
      await storeServerList(sampleServers);
    }

    if (existingAlerts.length === 0) {
      const sampleAlerts = [
        {
          id: '1',
          title: 'High CPU Usage',
          message: 'Web Server 01 CPU usage is at 85%',
          severity: 'warning',
          timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
          read: false,
          serverId: '1',
        },
        {
          id: '2',
          title: 'Server Offline',
          message: 'File Server is not responding',
          severity: 'critical',
          timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          read: false,
          serverId: '4',
        },
        {
          id: '3',
          title: 'Slow Response Time',
          message: 'API Gateway response time exceeded threshold',
          severity: 'warning',
          timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          read: true,
          serverId: '3',
        },
        {
          id: '4',
          title: 'Backup Completed',
          message: 'Daily backup completed successfully',
          severity: 'info',
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          read: true,
          serverId: '2',
        },
      ];
      await storeAlerts(sampleAlerts);
    }

    return true;
  } catch (error) {
    console.error('Error initializing sample data:', error);
    return false;
  }
};