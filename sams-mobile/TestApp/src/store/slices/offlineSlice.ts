import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  version: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  syncInProgress: boolean;
  pendingActions: number;
  failedActions: number;
  lastError: string | null;
}

export interface OfflineState {
  isOnline: boolean;
  queuedActions: QueuedAction[];
  cachedData: Record<string, CachedData>;
  syncStatus: SyncStatus;
  settings: {
    maxQueueSize: number;
    maxCacheSize: number;
    cacheExpiryTime: number; // milliseconds
    retryInterval: number; // milliseconds
    maxRetries: number;
  };
}

const initialState: OfflineState = {
  isOnline: true,
  queuedActions: [],
  cachedData: {},
  syncStatus: {
    isOnline: true,
    lastSync: null,
    syncInProgress: false,
    pendingActions: 0,
    failedActions: 0,
    lastError: null,
  },
  settings: {
    maxQueueSize: 100,
    maxCacheSize: 50,
    cacheExpiryTime: 24 * 60 * 60 * 1000, // 24 hours
    retryInterval: 5000, // 5 seconds
    maxRetries: 3,
  },
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    // Network status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      state.syncStatus.isOnline = action.payload;
      
      if (action.payload) {
        // When coming back online, reset failed actions count
        state.syncStatus.failedActions = 0;
        state.syncStatus.lastError = null;
      }
    },
    
    // Queue management
    addToQueue: (state, action: PayloadAction<Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const queuedAction: QueuedAction = {
        ...action.payload,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      // Add to queue with priority ordering
      const insertIndex = state.queuedActions.findIndex(
        item => getPriorityValue(item.priority) < getPriorityValue(queuedAction.priority)
      );
      
      if (insertIndex === -1) {
        state.queuedActions.push(queuedAction);
      } else {
        state.queuedActions.splice(insertIndex, 0, queuedAction);
      }
      
      // Maintain max queue size
      if (state.queuedActions.length > state.settings.maxQueueSize) {
        state.queuedActions = state.queuedActions.slice(0, state.settings.maxQueueSize);
      }
      
      state.syncStatus.pendingActions = state.queuedActions.length;
    },
    
    removeFromQueue: (state, action: PayloadAction<string>) => {
      state.queuedActions = state.queuedActions.filter(item => item.id !== action.payload);
      state.syncStatus.pendingActions = state.queuedActions.length;
    },
    
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const actionIndex = state.queuedActions.findIndex(item => item.id === action.payload);
      if (actionIndex !== -1) {
        state.queuedActions[actionIndex].retryCount++;
        
        // Remove if max retries exceeded
        if (state.queuedActions[actionIndex].retryCount >= state.queuedActions[actionIndex].maxRetries) {
          state.queuedActions.splice(actionIndex, 1);
          state.syncStatus.failedActions++;
        }
      }
      state.syncStatus.pendingActions = state.queuedActions.length;
    },
    
    clearQueue: (state) => {
      state.queuedActions = [];
      state.syncStatus.pendingActions = 0;
    },
    
    // Cache management
    setCachedData: (state, action: PayloadAction<{ key: string; data: any; expiryTime?: number }>) => {
      const { key, data, expiryTime = state.settings.cacheExpiryTime } = action.payload;
      const timestamp = Date.now();
      
      state.cachedData[key] = {
        key,
        data,
        timestamp,
        expiresAt: timestamp + expiryTime,
        version: 1,
      };
      
      // Maintain max cache size
      const cacheKeys = Object.keys(state.cachedData);
      if (cacheKeys.length > state.settings.maxCacheSize) {
        // Remove oldest entries
        const sortedKeys = cacheKeys.sort((a, b) => 
          state.cachedData[a].timestamp - state.cachedData[b].timestamp
        );
        const keysToRemove = sortedKeys.slice(0, cacheKeys.length - state.settings.maxCacheSize);
        keysToRemove.forEach(keyToRemove => {
          delete state.cachedData[keyToRemove];
        });
      }
    },
    
    removeCachedData: (state, action: PayloadAction<string>) => {
      delete state.cachedData[action.payload];
    },
    
    clearExpiredCache: (state) => {
      const now = Date.now();
      Object.keys(state.cachedData).forEach(key => {
        if (state.cachedData[key].expiresAt < now) {
          delete state.cachedData[key];
        }
      });
    },
    
    clearAllCache: (state) => {
      state.cachedData = {};
    },
    
    // Sync status
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncStatus.syncInProgress = action.payload;
    },
    
    setSyncSuccess: (state) => {
      state.syncStatus.lastSync = new Date().toISOString();
      state.syncStatus.syncInProgress = false;
      state.syncStatus.lastError = null;
    },
    
    setSyncError: (state, action: PayloadAction<string>) => {
      state.syncStatus.syncInProgress = false;
      state.syncStatus.lastError = action.payload;
      state.syncStatus.failedActions++;
    },
    
    // Settings
    updateOfflineSettings: (state, action: PayloadAction<Partial<OfflineState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // Reset
    resetOfflineState: () => initialState,
  },
});

// Helper function to get priority value for sorting
function getPriorityValue(priority: QueuedAction['priority']): number {
  switch (priority) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 1;
  }
}

export const {
  setOnlineStatus,
  addToQueue,
  removeFromQueue,
  incrementRetryCount,
  clearQueue,
  setCachedData,
  removeCachedData,
  clearExpiredCache,
  clearAllCache,
  setSyncInProgress,
  setSyncSuccess,
  setSyncError,
  updateOfflineSettings,
  resetOfflineState,
} = offlineSlice.actions;

export default offlineSlice.reducer;
