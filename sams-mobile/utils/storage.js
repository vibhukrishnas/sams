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