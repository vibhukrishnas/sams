import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { store } from '../store/index';
import { setOnlineStatus, setCachedData, clearExpiredCache, addToQueue } from '../store/slices/offlineSlice';
import { showToast } from '../store/slices/uiSlice';

interface CachedItem {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

class OfflineManager {
  private static instance: OfflineManager;
  private isInitialized = false;
  private syncInProgress = false;
  private cachePrefix = 'sams_cache_';
  private queuePrefix = 'sams_queue_';

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * Initialize offline manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing offline manager...');

      // Set up network listener
      this.setupNetworkListener();

      // Load cached data
      await this.loadCachedData();

      // Load queued actions
      await this.loadQueuedActions();

      // Clean expired cache
      await this.cleanExpiredCache();

      this.isInitialized = true;
      console.log('✅ Offline manager initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing offline manager:', error);
    }
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      const currentStatus = store.getState().offline.isOnline;

      if (currentStatus !== isOnline) {
        store.dispatch(setOnlineStatus(isOnline));

        if (isOnline) {
          console.log('📡 Connection restored - starting sync...');
          this.syncQueuedActions();
        } else {
          console.log('📡 Connection lost - entering offline mode...');
        }
      }
    });
  }

  /**
   * Cache data for offline access
   */
  async cacheData(key: string, data: any, expiryTime: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cacheItem: CachedItem = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiryTime,
      };

      // Store in AsyncStorage
      await AsyncStorage.setItem(`${this.cachePrefix}${key}`, JSON.stringify(cacheItem));

      // Update Redux store
      store.dispatch(setCachedData({
        key,
        data,
        expiryTime,
      }));

      console.log(`💾 Cached data for key: ${key}`);
    } catch (error) {
      console.error(`❌ Error caching data for key ${key}:`, error);
    }
  }

  /**
   * Get cached data
   */
  async getCachedData(key: string): Promise<any | null> {
    try {
      const cachedItem = await AsyncStorage.getItem(`${this.cachePrefix}${key}`);
      if (!cachedItem) return null;

      const parsed: CachedItem = JSON.parse(cachedItem);

      // Check if expired
      if (Date.now() > parsed.expiresAt) {
        await this.removeCachedData(key);
        return null;
      }

      console.log(`📦 Retrieved cached data for key: ${key}`);
      return parsed.data;
    } catch (error) {
      console.error(`❌ Error getting cached data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove cached data
   */
  async removeCachedData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.cachePrefix}${key}`);
      console.log(`🗑️ Removed cached data for key: ${key}`);
    } catch (error) {
      console.error(`❌ Error removing cached data for key ${key}:`, error);
    }
  }

  /**
   * Queue action for later execution
   */
  async queueAction(
    type: string,
    payload: any,
    priority: QueuedAction['priority'] = 'medium',
    maxRetries: number = 3
  ): Promise<void> {
    try {
      const queuedAction: QueuedAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries,
        priority,
      };

      // Store in AsyncStorage
      await AsyncStorage.setItem(`${this.queuePrefix}${queuedAction.id}`, JSON.stringify(queuedAction));

      // Update Redux store
      store.dispatch(addToQueue({
        type,
        payload,
        maxRetries,
        priority,
      }));

      console.log(`📤 Queued action: ${type} (Priority: ${priority})`);

      store.dispatch(showToast({
        message: 'Action queued for when connection is restored',
        type: 'info',
        duration: 2000,
      }));
    } catch (error) {
      console.error(`❌ Error queuing action ${type}:`, error);
    }
  }

  /**
   * Load cached data from storage
   */
  private async loadCachedData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));

      for (const key of cacheKeys) {
        const cachedItem = await AsyncStorage.getItem(key);
        if (cachedItem) {
          const parsed: CachedItem = JSON.parse(cachedItem);
          
          // Check if expired
          if (Date.now() > parsed.expiresAt) {
            await AsyncStorage.removeItem(key);
          } else {
            store.dispatch(setCachedData({
              key: parsed.key,
              data: parsed.data,
              expiryTime: parsed.expiresAt - parsed.timestamp,
            }));
          }
        }
      }

      console.log(`📦 Loaded ${cacheKeys.length} cached items`);
    } catch (error) {
      console.error('❌ Error loading cached data:', error);
    }
  }

  /**
   * Load queued actions from storage
   */
  private async loadQueuedActions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const queueKeys = keys.filter(key => key.startsWith(this.queuePrefix));

      for (const key of queueKeys) {
        const queuedAction = await AsyncStorage.getItem(key);
        if (queuedAction) {
          const parsed: QueuedAction = JSON.parse(queuedAction);
          
          store.dispatch(addToQueue({
            type: parsed.type,
            payload: parsed.payload,
            maxRetries: parsed.maxRetries,
            priority: parsed.priority,
          }));
        }
      }

      console.log(`📤 Loaded ${queueKeys.length} queued actions`);
    } catch (error) {
      console.error('❌ Error loading queued actions:', error);
    }
  }

  /**
   * Sync queued actions when online
   */
  private async syncQueuedActions(): Promise<void> {
    if (this.syncInProgress) return;

    try {
      this.syncInProgress = true;
      const state = store.getState();
      const queuedActions = state.offline.queuedActions;

      if (queuedActions.length === 0) {
        this.syncInProgress = false;
        return;
      }

      console.log(`📡 Syncing ${queuedActions.length} queued actions...`);

      let successCount = 0;
      let failureCount = 0;

      // Sort by priority
      const sortedActions = [...queuedActions].sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      for (const action of sortedActions) {
        try {
          // Simulate API call
          await this.executeAction(action);
          
          // Remove from storage
          await AsyncStorage.removeItem(`${this.queuePrefix}${action.id}`);
          
          successCount++;
          console.log(`✅ Successfully synced action: ${action.type}`);
        } catch (error) {
          console.error(`❌ Failed to sync action ${action.type}:`, error);
          failureCount++;
          
          // Increment retry count
          action.retryCount++;
          
          if (action.retryCount >= action.maxRetries) {
            // Remove failed action
            await AsyncStorage.removeItem(`${this.queuePrefix}${action.id}`);
            console.log(`🗑️ Removed failed action after ${action.maxRetries} retries: ${action.type}`);
          } else {
            // Update retry count in storage
            await AsyncStorage.setItem(`${this.queuePrefix}${action.id}`, JSON.stringify(action));
          }
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (successCount > 0) {
        store.dispatch(showToast({
          message: `Synced ${successCount} actions successfully`,
          type: 'success',
          duration: 3000,
        }));
      }

      if (failureCount > 0) {
        store.dispatch(showToast({
          message: `${failureCount} actions failed to sync`,
          type: 'warning',
          duration: 3000,
        }));
      }

      console.log(`📡 Sync completed: ${successCount} success, ${failureCount} failed`);
    } catch (error) {
      console.error('❌ Error syncing queued actions:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Execute a queued action
   */
  private async executeAction(action: QueuedAction): Promise<void> {
    // This would typically dispatch the action to the store
    // For now, we'll simulate the API call
    const apiBaseUrl = __DEV__ ? 'http://10.0.2.2:8080' : 'http://192.168.1.10:8080';
    
    // Map action types to API endpoints
    const endpointMap: Record<string, string> = {
      'alerts/acknowledge': '/api/v1/alerts/{id}/acknowledge',
      'alerts/resolve': '/api/v1/alerts/{id}/resolve',
      'servers/add': '/api/v1/servers',
      'servers/update': '/api/v1/servers/{id}',
      'settings/update': '/api/v1/settings',
    };

    const endpoint = endpointMap[action.type];
    if (!endpoint) {
      throw new Error(`Unknown action type: ${action.type}`);
    }

    // Make API call
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: action.type.includes('add') ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action.payload),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
  }

  /**
   * Clean expired cache
   */
  private async cleanExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      let removedCount = 0;

      for (const key of cacheKeys) {
        const cachedItem = await AsyncStorage.getItem(key);
        if (cachedItem) {
          const parsed: CachedItem = JSON.parse(cachedItem);
          
          if (Date.now() > parsed.expiresAt) {
            await AsyncStorage.removeItem(key);
            removedCount++;
          }
        }
      }

      if (removedCount > 0) {
        console.log(`🧹 Cleaned ${removedCount} expired cache items`);
      }

      // Update Redux store
      store.dispatch(clearExpiredCache());
    } catch (error) {
      console.error('❌ Error cleaning expired cache:', error);
    }
  }

  /**
   * Get offline manager status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
    };
  }
}

export default new OfflineManager();
