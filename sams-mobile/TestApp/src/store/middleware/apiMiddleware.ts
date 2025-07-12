import { Middleware } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import { RootState } from '../index';
import { setOnlineStatus, addToQueue } from '../slices/offlineSlice';
import { showToast } from '../slices/uiSlice';

/**
 * API middleware to handle network connectivity and request queuing
 */
export const apiMiddleware: Middleware<{}, RootState> = (store) => (next) => async (action) => {
  // Check network connectivity
  const netInfo = await NetInfo.fetch();
  const isOnline = netInfo.isConnected && netInfo.isInternetReachable;
  
  // Update online status if changed
  const currentOnlineStatus = store.getState().offline.isOnline;
  if (currentOnlineStatus !== isOnline) {
    store.dispatch(setOnlineStatus(isOnline));
    
    if (isOnline) {
      store.dispatch(showToast({
        message: 'Connection restored',
        type: 'success',
        duration: 2000,
      }));
    } else {
      store.dispatch(showToast({
        message: 'Working offline',
        type: 'warning',
        duration: 3000,
      }));
    }
  }
  
  // Handle API actions when offline
  if (!isOnline && isApiAction(action)) {
    // Queue the action for later execution
    store.dispatch(addToQueue({
      type: action.type,
      payload: action.payload,
      maxRetries: 3,
      priority: getActionPriority(action.type),
    }));
    
    store.dispatch(showToast({
      message: 'Action queued for when connection is restored',
      type: 'info',
      duration: 2000,
    }));
    
    // Don't process the action now
    return;
  }
  
  // Process the action
  const result = next(action);
  
  // Handle API errors
  if (action.type.includes('rejected')) {
    const error = action.payload;
    
    if (error?.status === 0 || error?.message?.includes('Network Error')) {
      store.dispatch(showToast({
        message: 'Network error. Please check your connection.',
        type: 'error',
        duration: 3000,
      }));
    } else if (error?.status >= 500) {
      store.dispatch(showToast({
        message: 'Server error. Please try again later.',
        type: 'error',
        duration: 3000,
      }));
    }
  }
  
  return result;
};

/**
 * Check if action is an API action that should be queued when offline
 */
function isApiAction(action: any): boolean {
  const apiActionTypes = [
    'servers/fetch',
    'alerts/fetch',
    'alerts/acknowledge',
    'alerts/resolve',
    'auth/refresh',
    'settings/sync',
  ];
  
  return apiActionTypes.some(type => action.type.includes(type));
}

/**
 * Get priority for action based on its type
 */
function getActionPriority(actionType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (actionType.includes('auth/')) return 'critical';
  if (actionType.includes('alerts/acknowledge') || actionType.includes('alerts/resolve')) return 'high';
  if (actionType.includes('alerts/')) return 'medium';
  return 'low';
}
