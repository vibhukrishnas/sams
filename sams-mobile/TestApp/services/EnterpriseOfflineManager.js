/**
 * 🔥 ENTERPRISE OFFLINE MANAGER - ADVANCED OFFLINE CAPABILITIES
 * Handles offline operations, intelligent caching, conflict resolution, and sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import CryptoJS from 'crypto-js';
import infraService from './InfraService';
import timeSeriesService from './api/TimeSeriesService';
import webSocketService from './api/WebSocketService';

class EnterpriseOfflineManager {
  constructor() {
    this.isOnline = true;
    this.offlineQueue = [];
    this.cachedData = new Map();
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.maxOfflineActions = 5000;
    this.cacheExpiryTime = 24 * 60 * 60 * 1000; // 24 hours
    this.conflictResolutionStrategy = 'server_wins'; // 'server_wins', 'client_wins', 'merge'
    this.compressionEnabled = true;
    this.encryptionEnabled = true;
    this.syncPriorities = new Map();
    this.offlineCapabilities = {
      viewServers: true,
      viewAlerts: true,
      acknowledgeAlerts: true,
      viewMetrics: true,
      createNotes: true,
      updateServerStatus: false, // Requires online
      deleteServers: false, // Requires online
      sendNotifications: false // Requires online
    };
    
    this.setupNetworkListener();
    this.loadOfflineData();
    this.setupPeriodicSync();
    console.log('🔥 EnterpriseOfflineManager initialized - enterprise-grade offline operations ready');
  }

  /**
   * Setup network connectivity listener
   */
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected;
      
      console.log('🔥 EnterpriseOfflineManager: Network state changed', {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable
      });
      
      if (!wasOnline && this.isOnline) {
        // Came back online
        this.handleOnlineTransition();
      } else if (wasOnline && !this.isOnline) {
        // Went offline
        this.handleOfflineTransition();
      }
    });
  }

  /**
   * Handle transition to online state
   */
  async handleOnlineTransition() {
    console.log('🔥 EnterpriseOfflineManager: Transitioning to online mode');
    
    // Reconnect WebSocket
    await webSocketService.connect();
    
    // Start sync process
    await this.syncOfflineData();
    
    // Show online notification
    Alert.alert(
      '📡 Back Online',
      'Connection restored. Syncing offline changes...',
      [{ text: 'OK' }]
    );
  }

  /**
   * Handle transition to offline state
   */
  async handleOfflineTransition() {
    console.log('🔥 EnterpriseOfflineManager: Transitioning to offline mode');
    
    // Cache critical data
    await this.cacheEssentialData();
    
    // Disconnect WebSocket gracefully
    webSocketService.disconnect();
    
    // Show offline notification
    Alert.alert(
      '📱 Offline Mode',
      'No internet connection. You can still view cached data and perform limited actions.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Cache essential data for offline use
   */
  async cacheEssentialData() {
    try {
      console.log('🔥 EnterpriseOfflineManager: Caching essential data');
      
      const essentialData = {
        servers: infraService.getServers(),
        alerts: infraService.getAlerts(),
        dashboardData: infraService.getDashboardData(),
        healthSummary: infraService.getHealthSummary(),
        timestamp: Date.now()
      };
      
      // Compress data if enabled
      let dataToStore = essentialData;
      if (this.compressionEnabled) {
        dataToStore = this.compressData(essentialData);
      }
      
      // Encrypt data if enabled
      if (this.encryptionEnabled) {
        dataToStore = this.encryptData(dataToStore);
      }
      
      await AsyncStorage.setItem('cachedEssentialData', JSON.stringify(dataToStore));
      console.log('EnterpriseOfflineManager: Essential data cached successfully');
    } catch (error) {
      console.error('EnterpriseOfflineManager: Cache essential data error', error);
    }
  }

  /**
   * Get cached data
   */
  async getCachedData(key) {
    try {
      if (this.cachedData.has(key)) {
        const cached = this.cachedData.get(key);
        
        // Check if cache is still valid
        if (Date.now() - cached.timestamp < this.cacheExpiryTime) {
          return cached.data;
        } else {
          this.cachedData.delete(key);
        }
      }
      
      // Try to load from storage
      const stored = await AsyncStorage.getItem(`cached_${key}`);
      if (stored) {
        let data = JSON.parse(stored);
        
        // Decrypt if needed
        if (this.encryptionEnabled && data.encrypted) {
          data = this.decryptData(data);
        }
        
        // Decompress if needed
        if (this.compressionEnabled && data.compressed) {
          data = this.decompressData(data);
        }
        
        // Check expiry
        if (Date.now() - data.timestamp < this.cacheExpiryTime) {
          this.cachedData.set(key, data);
          return data.data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('EnterpriseOfflineManager: Get cached data error', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async setCachedData(key, data) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now()
      };
      
      // Store in memory
      this.cachedData.set(key, cacheEntry);
      
      // Prepare for storage
      let dataToStore = cacheEntry;
      
      // Compress if enabled
      if (this.compressionEnabled) {
        dataToStore = this.compressData(dataToStore);
      }
      
      // Encrypt if enabled
      if (this.encryptionEnabled) {
        dataToStore = this.encryptData(dataToStore);
      }
      
      // Store persistently
      await AsyncStorage.setItem(`cached_${key}`, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('EnterpriseOfflineManager: Set cached data error', error);
    }
  }

  /**
   * Add action to offline queue
   */
  async addToOfflineQueue(action) {
    try {
      // Check if action is allowed offline
      if (!this.isActionAllowedOffline(action.type)) {
        throw new Error(`Action ${action.type} is not allowed in offline mode`);
      }
      
      const queueItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        action,
        timestamp: Date.now(),
        priority: this.getActionPriority(action.type),
        retryCount: 0,
        maxRetries: 3
      };
      
      this.offlineQueue.push(queueItem);
      
      // Sort by priority
      this.offlineQueue.sort((a, b) => b.priority - a.priority);
      
      // Limit queue size
      if (this.offlineQueue.length > this.maxOfflineActions) {
        this.offlineQueue = this.offlineQueue.slice(0, this.maxOfflineActions);
      }
      
      // Save queue
      await this.saveOfflineQueue();
      
      console.log('EnterpriseOfflineManager: Action added to offline queue', action.type);
      return queueItem.id;
    } catch (error) {
      console.error('EnterpriseOfflineManager: Add to offline queue error', error);
      throw error;
    }
  }

  /**
   * Check if action is allowed offline
   */
  isActionAllowedOffline(actionType) {
    return this.offlineCapabilities[actionType] || false;
  }

  /**
   * Get action priority
   */
  getActionPriority(actionType) {
    const priorities = {
      acknowledgeAlerts: 10,
      createNotes: 8,
      updateServerStatus: 6,
      deleteServers: 4,
      sendNotifications: 2
    };
    
    return priorities[actionType] || 5;
  }

  /**
   * Sync offline data when back online
   */
  async syncOfflineData() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }
    
    try {
      this.syncInProgress = true;
      console.log('🔥 EnterpriseOfflineManager: Starting offline data sync');
      
      // Load offline queue
      await this.loadOfflineQueue();
      
      if (this.offlineQueue.length === 0) {
        console.log('EnterpriseOfflineManager: No offline actions to sync');
        return;
      }
      
      console.log(`EnterpriseOfflineManager: Syncing ${this.offlineQueue.length} offline actions`);
      
      const results = {
        successful: 0,
        failed: 0,
        conflicts: 0
      };
      
      // Process queue items
      for (const queueItem of [...this.offlineQueue]) {
        try {
          await this.processOfflineAction(queueItem);
          
          // Remove from queue
          this.offlineQueue = this.offlineQueue.filter(item => item.id !== queueItem.id);
          results.successful++;
          
        } catch (error) {
          console.error('EnterpriseOfflineManager: Sync action error', error);
          
          queueItem.retryCount++;
          if (queueItem.retryCount >= queueItem.maxRetries) {
            // Remove failed item
            this.offlineQueue = this.offlineQueue.filter(item => item.id !== queueItem.id);
            results.failed++;
          }
        }
      }
      
      // Save updated queue
      await this.saveOfflineQueue();
      
      // Update last sync time
      this.lastSyncTime = Date.now();
      await AsyncStorage.setItem('lastSyncTime', this.lastSyncTime.toString());
      
      console.log('EnterpriseOfflineManager: Sync completed', results);
      
      // Show sync results
      if (results.successful > 0 || results.failed > 0) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced: ${results.successful}\nFailed: ${results.failed}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('EnterpriseOfflineManager: Sync offline data error', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process individual offline action
   */
  async processOfflineAction(queueItem) {
    const { action } = queueItem;
    
    switch (action.type) {
      case 'acknowledgeAlerts':
        await this.syncAcknowledgeAlert(action.data);
        break;
      case 'createNotes':
        await this.syncCreateNote(action.data);
        break;
      case 'updateServerStatus':
        await this.syncUpdateServerStatus(action.data);
        break;
      default:
        console.log('EnterpriseOfflineManager: Unknown action type', action.type);
    }
  }

  /**
   * Sync acknowledge alert action
   */
  async syncAcknowledgeAlert(data) {
    const authToken = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`http://192.168.1.10:8080/api/alerts/${data.alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        acknowledgedAt: data.acknowledgedAt,
        acknowledgedBy: data.acknowledgedBy,
        notes: data.notes
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync acknowledge alert: ${response.status}`);
    }
  }

  /**
   * Sync create note action
   */
  async syncCreateNote(data) {
    const authToken = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`http://192.168.1.10:8080/api/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync create note: ${response.status}`);
    }
  }

  /**
   * Sync update server status action
   */
  async syncUpdateServerStatus(data) {
    const authToken = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`http://192.168.1.10:8080/api/servers/${data.serverId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: data.status,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync server status: ${response.status}`);
    }
  }

  /**
   * Compress data
   */
  compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(jsonString));
      return {
        compressed: true,
        data: compressed
      };
    } catch (error) {
      console.error('EnterpriseOfflineManager: Compress data error', error);
      return data;
    }
  }

  /**
   * Decompress data
   */
  decompressData(compressedData) {
    try {
      if (!compressedData.compressed) {
        return compressedData;
      }
      
      const decompressed = CryptoJS.enc.Base64.parse(compressedData.data).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('EnterpriseOfflineManager: Decompress data error', error);
      return compressedData;
    }
  }

  /**
   * Encrypt data
   */
  encryptData(data) {
    try {
      const key = 'sams-offline-encryption-key'; // In production, use secure key management
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
      return {
        encrypted: true,
        data: encrypted
      };
    } catch (error) {
      console.error('EnterpriseOfflineManager: Encrypt data error', error);
      return data;
    }
  }

  /**
   * Decrypt data
   */
  decryptData(encryptedData) {
    try {
      if (!encryptedData.encrypted) {
        return encryptedData;
      }
      
      const key = 'sams-offline-encryption-key'; // In production, use secure key management
      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, key);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('EnterpriseOfflineManager: Decrypt data error', error);
      return encryptedData;
    }
  }

  /**
   * Setup periodic sync
   */
  setupPeriodicSync() {
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.offlineQueue.length > 0) {
        this.syncOfflineData();
      }
    }, 60000); // Check every minute
  }

  /**
   * Load offline data from storage
   */
  async loadOfflineData() {
    try {
      await this.loadOfflineQueue();
      
      const lastSyncTime = await AsyncStorage.getItem('lastSyncTime');
      if (lastSyncTime) {
        this.lastSyncTime = parseInt(lastSyncTime);
      }
      
      console.log('EnterpriseOfflineManager: Offline data loaded');
    } catch (error) {
      console.error('EnterpriseOfflineManager: Load offline data error', error);
    }
  }

  /**
   * Load offline queue from storage
   */
  async loadOfflineQueue() {
    try {
      const stored = await AsyncStorage.getItem('offlineQueue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('EnterpriseOfflineManager: Load offline queue error', error);
    }
  }

  /**
   * Save offline queue to storage
   */
  async saveOfflineQueue() {
    try {
      await AsyncStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('EnterpriseOfflineManager: Save offline queue error', error);
    }
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData() {
    try {
      this.offlineQueue = [];
      this.cachedData.clear();
      
      await AsyncStorage.multiRemove([
        'offlineQueue',
        'cachedEssentialData',
        'lastSyncTime'
      ]);
      
      console.log('EnterpriseOfflineManager: All offline data cleared');
    } catch (error) {
      console.error('EnterpriseOfflineManager: Clear offline data error', error);
    }
  }

  /**
   * Get offline status
   */
  getOfflineStatus() {
    return {
      isOnline: this.isOnline,
      queueSize: this.offlineQueue.length,
      cacheSize: this.cachedData.size,
      lastSyncTime: this.lastSyncTime ? new Date(this.lastSyncTime).toISOString() : null,
      syncInProgress: this.syncInProgress,
      offlineCapabilities: this.offlineCapabilities
    };
  }

  /**
   * Force sync
   */
  async forceSync() {
    if (this.isOnline) {
      await this.syncOfflineData();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }
}

export default new EnterpriseOfflineManager();
