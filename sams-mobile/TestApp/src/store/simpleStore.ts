/**
 * 🏪 Simple Redux Store Configuration
 * Basic state management setup for authentication
 */

import { configureStore, createSlice } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    user: null,
    isLoading: false,
  },
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
    },
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.isLoading = false;
    },
    loginFailure: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
    },
  },
});

// Persist configuration
const persistConfig = {
  key: 'sams-simple',
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist auth
};

// Persisted reducer
const persistedAuthReducer = persistReducer(persistConfig, authSlice.reducer);

// Configure store
export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: __DEV__,
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export actions
export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
