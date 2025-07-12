import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { removeFromQueue, incrementRetryCount, setSyncInProgress, setSyncSuccess, setSyncError } from '../slices/offlineSlice';

/**
 * Offline middleware to handle queued actions when connection is restored
 */
export const offlineMiddleware: Middleware<{}, RootState> = (store) => (next) => async (action) => {
  const result = next(action);
  
  // When coming back online, process queued actions
  if (action.type === 'offline/setOnlineStatus' && action.payload === true) {
    const state = store.getState();
    const queuedActions = state.offline.queuedActions;
    
    if (queuedActions.length > 0) {
      console.log(`📡 Processing ${queuedActions.length} queued actions...`);
      store.dispatch(setSyncInProgress(true));
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process actions in priority order
      for (const queuedAction of queuedActions) {
        try {
          // Recreate the original action
          const originalAction = {
            type: queuedAction.type,
            payload: queuedAction.payload,
          };
          
          // Dispatch the action
          await store.dispatch(originalAction);
          
          // Remove from queue on success
          store.dispatch(removeFromQueue(queuedAction.id));
          successCount++;
          
          console.log(`✅ Successfully processed queued action: ${queuedAction.type}`);
          
        } catch (error) {
          console.error(`❌ Failed to process queued action: ${queuedAction.type}`, error);
          
          // Increment retry count
          store.dispatch(incrementRetryCount(queuedAction.id));
          failureCount++;
          
          // Add delay between retries to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (failureCount === 0) {
        store.dispatch(setSyncSuccess());
        console.log(`✅ Successfully processed all ${successCount} queued actions`);
      } else {
        store.dispatch(setSyncError(`Failed to process ${failureCount} actions`));
        console.log(`⚠️ Processed ${successCount} actions, ${failureCount} failed`);
      }
    }
  }
  
  return result;
};
