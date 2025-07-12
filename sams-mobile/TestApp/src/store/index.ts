import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API
import { samsApi } from './api/samsApi';

// Slices
import authSlice from './slices/authSlice';
import alertSlice from './slices/alertSlice';
import serverSlice from './slices/serverSlice';
import uiSlice from './slices/uiSlice';
import settingsSlice from './slices/settingsSlice';
import offlineSlice from './slices/offlineSlice';

// Middleware
import { authMiddleware } from './middleware/authMiddleware';
import { apiMiddleware } from './middleware/apiMiddleware';
import { offlineMiddleware } from './middleware/offlineMiddleware';

// Persist configuration
const persistConfig = {
  key: 'sams-root',
  storage: AsyncStorage,
  version: 1,
  whitelist: ['auth', 'settings', 'ui'], // Only persist these slices
  blacklist: ['alerts', 'servers', 'offline'], // Don't persist real-time data
  timeout: 10000, // 10 seconds timeout
};

// Root reducer
const rootReducer = combineReducers({
  // API slice
  [samsApi.reducerPath]: samsApi.reducer,

  // Feature slices
  auth: authSlice,
  alerts: alertSlice,
  servers: serverSlice,
  ui: uiSlice,
  settings: settingsSlice,
  offline: offlineSlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
          samsApi.util.getRunningQueriesThunk.fulfilled.type,
        ],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
      immutableCheck: {
        ignoredPaths: ['ignoredPath'],
      },
    })
    .concat(samsApi.middleware)
    .concat(authMiddleware)
    .concat(apiMiddleware)
    .concat(offlineMiddleware),
  devTools: __DEV__ && {
    name: 'SAMS Mobile Store',
    trace: true,
    traceLimit: 25,
  },
});

// Enable listener behavior for the store
setupListeners(store.dispatch);

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks for components
export { useAppDispatch, useAppSelector } from './hooks';
