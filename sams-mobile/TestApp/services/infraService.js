/**
 * 🏗️ Infrastructure Service - Core Mobile Infrastructure
 * Enterprise-grade React Native infrastructure with TypeScript, Redux, and secure storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import BackgroundJob from 'react-native-background-job';
import PushNotification from 'react-native-push-notification';
import Keychain from 'react-native-keychain';
import DeviceInfo from 'react-native-device-info';

// Redux Store Configuration
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    biometricEnabled: false,
    pinEnabled: false,
    loading: false,
    error: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.error = null;
      state.loading = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
    },
    updateBiometric: (state, action) => {
      state.biometricEnabled = action.payload;
    },
    updatePin: (state, action) => {
      state.pinEnabled = action.payload;
    },
  },
});

const serverSlice = createSlice({
  name: 'servers',
  initialState: {
    servers: [],
    selectedServer: null,
    loading: false,
    error: null,
    lastUpdated: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setServers: (state, action) => {
      state.servers = action.payload;
      state.lastUpdated = new Date().toISOString();
      state.loading = false;
    },
    setSelectedServer: (state, action) => {
      state.selectedServer = action.payload;
    },
    updateServerStatus: (state, action) => {
      const { serverId, status } = action.payload;
      const server = state.servers.find(s => s.id === serverId);
      if (server) {
        server.status = status;
        server.lastUpdated = new Date().toISOString();
      }
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

const alertSlice = createSlice({
  name: 'alerts',
  initialState: {
    alerts: [],
    unreadCount: 0,
    loading: false,
    error: null,
    filters: {
      severity: 'all',
      status: 'all',
      serverId: null,
    },
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setAlerts: (state, action) => {
      state.alerts = action.payload;
      state.unreadCount = action.payload.filter(alert => !alert.acknowledged).length;
      state.loading = false;
    },
    addAlert: (state, action) => {
      state.alerts.unshift(action.payload);
      if (!action.payload.acknowledged) {
        state.unreadCount += 1;
      }
    },
    acknowledgeAlert: (state, action) => {
      const alert = state.alerts.find(a => a.id === action.payload);
      if (alert && !alert.acknowledged) {
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    resolveAlert: (state, action) => {
      const alert = state.alerts.find(a => a.id === action.payload);
      if (alert) {
        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
      }
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

// Async Thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ username, password, pin }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, pin }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      // Store tokens securely
      await Keychain.setInternetCredentials(
        'sams_tokens',
        data.token,
        data.refreshToken
      );

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchServers = createAsyncThunk(
  'servers/fetchServers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch(`${API_BASE_URL}/api/v1/servers`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch servers');
      }

      const data = await response.json();
      return data.content || data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await fetch(`${API_BASE_URL}/api/v1/alerts`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      return data.content || data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Store Configuration
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    servers: serverSlice.reducer,
    alerts: alertSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// Action Exports
export const { 
  setLoading: setAuthLoading,
  setError: setAuthError,
  loginSuccess,
  logout,
  updateBiometric,
  updatePin,
} = authSlice.actions;

export const {
  setLoading: setServerLoading,
  setServers,
  setSelectedServer,
  updateServerStatus,
  setError: setServerError,
} = serverSlice.actions;

export const {
  setLoading: setAlertLoading,
  setAlerts,
  addAlert,
  acknowledgeAlert,
  resolveAlert,
  setFilters,
  setError: setAlertError,
} = alertSlice.actions;

// Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.10:8080' 
  : 'https://api.sams-monitoring.com';

export default {
  store,
  API_BASE_URL,
};
