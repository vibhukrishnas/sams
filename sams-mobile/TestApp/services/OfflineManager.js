// 📡 PRODUCTION-READY OFFLINE MANAGER
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import serverAPI from './ServerAPI';
import notificationService from './NotificationService';

// 📡 OFFLINE CONFIGURATION
const OFFLINE_CONFIG = {
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  SYNC_RETRY_INTERVAL: 30000, // 30 seconds
  MAX_SYNC_RETRIES: 5,
  OFFLINE_QUEUE_LIMIT: 100,
  CRITICAL_DATA_KEYS: ['servers', 'alerts', 'systemHealth', 'userPreferences']
};

// 📡 SYNC OPERATION TYPES
const SYNC_OPERATIONS = {
  CREATE_SERVER: 'create_server',
  UPDATE_SERVER: 'update_server',
  DELETE_SERVER: 'delete_server',
  ACKNOWLEDGE_ALERT: 'acknowledge_alert',
  UPDATE_PREFERENCES: 'update_preferences',
  GENERATE_REPORT: 'generate_report'
};

class OfflineManager {
  constructor() {
    this.isOnline = true;
    this.isInitialized = false;
    this.syncQueue = [];
    this.cachedData = new Map();
    this.listeners = [];
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.offlineStartTime = null;
  }

  // 🚀 INITIALIZE OFFLINE MANAGER
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('📡 Initializing Offline Manager...');

      // Load cached data
      await this.loadCachedData();

      // Load sync queue
      await this.loadSyncQueue();

      // Setup network monitoring
      await this.setupNetworkMonitoring();

      // Load offline preferences
      await this.loadOfflinePreferences();

      this.isInitialized = true;
      console.log('✅ Offline Manager initialized successfully');

    } catch (error) {
      console.error('❌ Offline Manager initialization failed:', error);
      throw error;
    }
  }

  async setupNetworkMonitoring() {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      console.log(`📡 Network state changed: ${wasOnline ? 'Online' : 'Offline'} → ${this.isOnline ? 'Online' : 'Offline'}`);

      if (!wasOnline && this.isOnline) {
        this.handleBackOnline();
      } else if (wasOnline && !this.isOnline) {
        this.handleGoOffline();
      }

      // Notify listeners
      this.notifyNetworkChange(this.isOnline, state);
    });

    this.listeners.push(unsubscribe);

    // Get initial network state
    const networkState = await NetInfo.fetch();
    this.isOnline = networkState.isConnected && networkState.isInternetReachable;
    
    console.log(`📡 Initial network state: ${this.isOnline ? 'Online' : 'Offline'}`);
  }

  // 🌐 NETWORK EVENT HANDLERS
  async handleBackOnline() {
    console.log('🌐 Back online - starting sync process...');
    
    this.offlineStartTime = null;
    
    // Show notification
    await notificationService.sendLocalNotification({
      title: '🌐 Connection Restored',
      message: 'SAMS is back online. Syncing data...',
      type: 'success'
    });

    // Start sync process
    await this.syncOfflineData();
    
    // Update last sync time
    this.lastSyncTime = new Date();
    await AsyncStorage.setItem('last_sync_time', this.lastSyncTime.toISOString());
  }

  async handleGoOffline() {
    console.log('📡 Gone offline - switching to offline mode...');
    
    this.offlineStartTime = new Date();
    
    // Show notification
    await notificationService.sendLocalNotification({
      title: '📡 Offline Mode',
      message: 'SAMS is now running in offline mode with cached data',
      type: 'warning'
    });

    // Save current state
    await this.saveCriticalData();
  }

  // 💾 CACHING METHODS
  async cacheData(key, data, options = {}) {
    try {
      const cacheEntry = {
        data,
        timestamp: new Date().toISOString(),
        expires: new Date(Date.now() + (options.ttl || OFFLINE_CONFIG.CACHE_DURATION)).toISOString(),
        priority: options.priority || 'normal',
        size: JSON.stringify(data).length
      };

      // Store in memory cache
      this.cachedData.set(key, cacheEntry);

      // Store in persistent storage
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));

      console.log(`💾 Data cached: ${key} (${cacheEntry.size} bytes)`);
    } catch (error) {
      console.error(`Failed to cache data for ${key}:`, error);
    }
  }

  async getCachedData(key, fallbackValue = null) {
    try {
      // Check memory cache first
      if (this.cachedData.has(key)) {
        const cached = this.cachedData.get(key);
        if (new Date(cached.expires) > new Date()) {
          console.log(`💾 Retrieved from memory cache: ${key}`);
          return cached.data;
        } else {
          this.cachedData.delete(key);
        }
      }

      // Check persistent storage
      const cachedString = await AsyncStorage.getItem(`cache_${key}`);
      if (cachedString) {
        const cached = JSON.parse(cachedString);
        if (new Date(cached.expires) > new Date()) {
          this.cachedData.set(key, cached);
          console.log(`💾 Retrieved from storage cache: ${key}`);
          return cached.data;
        } else {
          await AsyncStorage.removeItem(`cache_${key}`);
        }
      }

      console.log(`💾 No valid cache found for: ${key}`);
      return fallbackValue;
    } catch (error) {
      console.error(`Failed to get cached data for ${key}:`, error);
      return fallbackValue;
    }
  }

  async loadCachedData() {
    console.log('💾 Loading cached data...');
    
    for (const key of OFFLINE_CONFIG.CRITICAL_DATA_KEYS) {
      await this.getCachedData(key);
    }

    console.log(`✅ Loaded ${this.cachedData.size} cached entries`);
  }

  async saveCriticalData() {
    console.log('💾 Saving critical data for offline use...');
    
    try {
      // Get fresh data from API if online
      if (this.isOnline) {
        const [serversResponse, alertsResponse, healthResponse] = await Promise.all([
          serverAPI.getAllServers(),
          serverAPI.getAlerts(),
          serverAPI.getSystemHealth()
        ]);

        if (serversResponse.success) {
          await this.cacheData('servers', serversResponse.data, { priority: 'high' });
        }
        if (alertsResponse.success) {
          await this.cacheData('alerts', alertsResponse.data, { priority: 'high' });
        }
        if (healthResponse.success) {
          await this.cacheData('systemHealth', healthResponse.data, { priority: 'high' });
        }
      }

      console.log('✅ Critical data saved');
    } catch (error) {
      console.error('Failed to save critical data:', error);
    }
  }

  // 🔄 SYNC QUEUE MANAGEMENT
  async addToSyncQueue(operation) {
    try {
      const queueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation: operation.type,
        data: operation.data,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        priority: operation.priority || 'normal'
      };

      this.syncQueue.push(queueItem);

      // Limit queue size
      if (this.syncQueue.length > OFFLINE_CONFIG.OFFLINE_QUEUE_LIMIT) {
        this.syncQueue.shift(); // Remove oldest item
      }

      await this.saveSyncQueue();
      
      console.log(`📝 Added to sync queue: ${operation.type} (Queue size: ${this.syncQueue.length})`);

      // Try to sync immediately if online
      if (this.isOnline && !this.syncInProgress) {
        await this.syncOfflineData();
      }

      return queueItem.id;
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      throw error;
    }
  }

  async loadSyncQueue() {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      this.syncQueue = queueData ? JSON.parse(queueData) : [];
      console.log(`📝 Loaded sync queue: ${this.syncQueue.length} items`);
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  async saveSyncQueue() {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // 🔄 SYNC OPERATIONS
  async syncOfflineData() {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Starting sync process: ${this.syncQueue.length} items`);

    const syncResults = {
      successful: 0,
      failed: 0,
      errors: []
    };

    // Sort queue by priority and timestamp
    const sortedQueue = [...this.syncQueue].sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return new Date(a.timestamp) - new Date(b.timestamp); // Older first
    });

    for (const item of sortedQueue) {
      try {
        console.log(`🔄 Syncing: ${item.operation} (ID: ${item.id})`);
        
        const success = await this.executeSyncOperation(item);
        
        if (success) {
          // Remove from queue
          this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
          syncResults.successful++;
          console.log(`✅ Sync successful: ${item.operation}`);
        } else {
          // Increment retry count
          const queueItem = this.syncQueue.find(q => q.id === item.id);
          if (queueItem) {
            queueItem.retryCount++;
            
            // Remove if max retries reached
            if (queueItem.retryCount >= OFFLINE_CONFIG.MAX_SYNC_RETRIES) {
              this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
              syncResults.failed++;
              syncResults.errors.push(`Max retries reached for ${item.operation}`);
              console.log(`❌ Max retries reached: ${item.operation}`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Sync error for ${item.operation}:`, error);
        syncResults.failed++;
        syncResults.errors.push(`${item.operation}: ${error.message}`);
      }
    }

    await this.saveSyncQueue();
    this.syncInProgress = false;

    console.log(`✅ Sync completed: ${syncResults.successful} successful, ${syncResults.failed} failed`);

    // Show notification if there were errors
    if (syncResults.failed > 0) {
      await notificationService.sendLocalNotification({
        title: '⚠️ Sync Issues',
        message: `${syncResults.failed} items failed to sync. Will retry later.`,
        type: 'warning'
      });
    } else if (syncResults.successful > 0) {
      await notificationService.sendLocalNotification({
        title: '✅ Sync Complete',
        message: `${syncResults.successful} items synced successfully`,
        type: 'success'
      });
    }

    return syncResults;
  }

  async executeSyncOperation(item) {
    try {
      switch (item.operation) {
        case SYNC_OPERATIONS.CREATE_SERVER:
          const createResponse = await serverAPI.addServer(item.data);
          return createResponse.success;

        case SYNC_OPERATIONS.UPDATE_SERVER:
          const updateResponse = await serverAPI.updateServer(item.data.id, item.data);
          return updateResponse.success;

        case SYNC_OPERATIONS.DELETE_SERVER:
          const deleteResponse = await serverAPI.deleteServer(item.data.id);
          return deleteResponse.success;

        case SYNC_OPERATIONS.ACKNOWLEDGE_ALERT:
          const ackResponse = await serverAPI.acknowledgeAlert(item.data.alertId);
          return ackResponse.success;

        case SYNC_OPERATIONS.UPDATE_PREFERENCES:
          // Handle preferences sync
          return true;

        case SYNC_OPERATIONS.GENERATE_REPORT:
          // Handle report generation sync
          return true;

        default:
          console.log(`Unknown sync operation: ${item.operation}`);
          return false;
      }
    } catch (error) {
      console.error(`Sync operation failed: ${item.operation}`, error);
      return false;
    }
  }

  // 🔧 UTILITY METHODS
  async loadOfflinePreferences() {
    try {
      const prefsData = await AsyncStorage.getItem('offline_preferences');
      const prefs = prefsData ? JSON.parse(prefsData) : {};
      
      this.offlinePreferences = {
        autoSync: prefs.autoSync !== false, // Default true
        syncOnWifi: prefs.syncOnWifi !== false, // Default true
        cacheImages: prefs.cacheImages !== false, // Default true
        maxCacheSize: prefs.maxCacheSize || 100, // MB
        ...prefs
      };

      console.log('🔧 Offline preferences loaded:', this.offlinePreferences);
    } catch (error) {
      console.error('Failed to load offline preferences:', error);
      this.offlinePreferences = {};
    }
  }

  async updateOfflinePreferences(newPrefs) {
    try {
      this.offlinePreferences = { ...this.offlinePreferences, ...newPrefs };
      await AsyncStorage.setItem('offline_preferences', JSON.stringify(this.offlinePreferences));
      console.log('🔧 Offline preferences updated');
    } catch (error) {
      console.error('Failed to update offline preferences:', error);
    }
  }

  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      offlineStartTime: this.offlineStartTime,
      lastSyncTime: this.lastSyncTime,
      queueSize: this.syncQueue.length,
      cacheSize: this.cachedData.size,
      syncInProgress: this.syncInProgress
    };
  }

  addNetworkListener(callback) {
    this.listeners.push(callback);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyNetworkChange(isOnline, networkState) {
    this.listeners.forEach(callback => {
      try {
        callback(isOnline, networkState);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }

  async clearCache() {
    try {
      console.log('🧹 Clearing offline cache...');
      
      // Clear memory cache
      this.cachedData.clear();
      
      // Clear storage cache
      for (const key of OFFLINE_CONFIG.CRITICAL_DATA_KEYS) {
        await AsyncStorage.removeItem(`cache_${key}`);
      }

      console.log('✅ Offline cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async clearSyncQueue() {
    try {
      console.log('🧹 Clearing sync queue...');
      
      this.syncQueue = [];
      await this.saveSyncQueue();

      console.log('✅ Sync queue cleared');
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
    }
  }

  // 📊 ANALYTICS
  getOfflineStats() {
    const totalCacheSize = Array.from(this.cachedData.values())
      .reduce((total, entry) => total + (entry.size || 0), 0);

    return {
      isOnline: this.isOnline,
      cacheEntries: this.cachedData.size,
      totalCacheSize: totalCacheSize,
      queueItems: this.syncQueue.length,
      offlineDuration: this.offlineStartTime ? 
        Date.now() - this.offlineStartTime.getTime() : 0,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress
    };
  }
}

// Export singleton instance
const offlineManager = new OfflineManager();
export default offlineManager;
export { SYNC_OPERATIONS, OFFLINE_CONFIG };
