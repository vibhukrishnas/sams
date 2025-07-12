import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';
import AuthenticationService from '../../services/AuthenticationService';
import ApiService from '../../services/ApiService';

// Define types
export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  server: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  acknowledgedBy?: string;
  resolvedBy?: string;
  notes?: string;
  resolution?: string;
}

export interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  type: 'windows' | 'linux' | 'mac';
  status: 'online' | 'offline' | 'warning';
  description: string;
  lastChecked: string;
  uptime: number;
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  processes: number;
  temperature?: number;
}

export interface SystemHealth {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  criticalAlerts: number;
  warningAlerts: number;
  lastUpdate: string;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  avgDiskUsage: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  organizationId: string;
  lastLogin: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Base URL configuration
const getBaseUrl = () => {
  // Try different URLs based on environment
  if (__DEV__) {
    return 'http://10.0.2.2:8080'; // Android emulator
  }
  return 'http://192.168.1.10:8080'; // Production/real device
};

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: `${getBaseUrl()}/api/v1/`,
  prepareHeaders: async (headers, { getState }) => {
    // Get token from state or storage
    const state = getState() as RootState;
    let token = state.auth.token;

    if (!token) {
      const tokens = await AuthenticationService.getStoredTokens();
      token = tokens?.accessToken;
    }

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    headers.set('Content-Type', 'application/json');
    headers.set('X-Client-Version', '2.1.0');
    headers.set('X-Platform', 'mobile');

    return headers;
  },
});

// Enhanced base query with ApiService integration
const enhancedBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const apiServiceInstance = ApiService.getInstance();

  // Check if we're online
  if (!apiServiceInstance.isNetworkOnline()) {
    console.log('📱 Offline mode: Request will be queued');
    // RTK Query will handle this as an error, but ApiService will queue it
  }

  // Use the standard base query first
  let result = await baseQuery(args, api, extraOptions);

  // Handle authentication errors with enhanced retry logic
  if (result.error && result.error.status === 401) {
    console.log('🔄 Token expired, attempting refresh...');

    try {
      const authService = AuthenticationService.getInstance();
      const refreshed = await authService.refreshToken();

      if (refreshed) {
        console.log('✅ Token refreshed successfully');
        // Update the authorization header and retry
        const tokens = await authService.getStoredTokens();
        if (tokens?.accessToken) {
          // Retry the original query with new token
          result = await baseQuery(args, api, extraOptions);
        }
      } else {
        console.log('❌ Token refresh failed, logging out');
        await authService.logout();
        api.dispatch({ type: 'auth/logout' });
      }
    } catch (refreshError) {
      console.error('❌ Token refresh error:', refreshError);
      const authService = AuthenticationService.getInstance();
      await authService.logout();
      api.dispatch({ type: 'auth/logout' });
    }
  }

  // Handle network errors with better error messages
  if (result.error && !result.error.status) {
    console.log('🌐 Network error detected, ApiService will handle retry/queue');

    // Enhance error message for offline scenarios
    if (!apiServiceInstance.isNetworkOnline()) {
      result.error = {
        ...result.error,
        data: {
          message: 'You are offline. Request will be processed when connection is restored.',
          offline: true,
          queuedRequests: apiServiceInstance.getQueuedRequestsCount(),
        },
      };
    }
  }

  return result;
};

// Define the API with enhanced base query
export const samsApi = createApi({
  reducerPath: 'samsApi',
  baseQuery: enhancedBaseQuery,
  tagTypes: ['Alert', 'Server', 'Health', 'User', 'Settings', 'Report', 'Dashboard', 'Voice', 'Emergency'],
  endpoints: (builder) => ({
    // Authentication endpoints
    login: builder.mutation<LoginResponse, { username: string; password: string; pin?: string }>({
      query: (credentials) => ({
        url: 'auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    refreshToken: builder.mutation<{ accessToken: string; refreshToken: string; expiresIn: number }, { refreshToken: string }>({
      query: (body) => ({
        url: 'auth/refresh',
        method: 'POST',
        body,
      }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
    }),

    // Health endpoints
    getSystemHealth: builder.query<SystemHealth, void>({
      query: () => 'health',
      providesTags: ['Health'],
    }),

    // Alert endpoints
    getAlerts: builder.query<Alert[], { status?: string; severity?: string; serverId?: string }>({
      query: (params) => ({
        url: 'alerts',
        params,
      }),
      providesTags: ['Alert'],
    }),

    getAlert: builder.query<Alert, string>({
      query: (id) => `alerts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Alert', id }],
    }),

    acknowledgeAlert: builder.mutation<void, { id: string; userId: string; notes?: string }>({
      query: ({ id, ...body }) => ({
        url: `alerts/${id}/acknowledge`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Alert', id }],
    }),

    resolveAlert: builder.mutation<void, { id: string; userId: string; resolution: string }>({
      query: ({ id, ...body }) => ({
        url: `alerts/${id}/resolve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Alert', id }],
    }),

    // Server endpoints
    getServers: builder.query<Server[], void>({
      query: () => 'servers',
      providesTags: ['Server'],
    }),
    
    getServerById: builder.query<Server, string>({
      query: (id) => `servers/${id}`,
      providesTags: ['Server'],
    }),
    
    addServer: builder.mutation<Server, Partial<Server>>({
      query: (server) => ({
        url: 'servers',
        method: 'POST',
        body: server,
      }),
      invalidatesTags: ['Server', 'Health'],
    }),
    
    updateServer: builder.mutation<Server, { id: string; server: Partial<Server> }>({
      query: ({ id, server }) => ({
        url: `servers/${id}`,
        method: 'PUT',
        body: server,
      }),
      invalidatesTags: ['Server', 'Health'],
    }),
    
    deleteServer: builder.mutation<void, string>({
      query: (id) => ({
        url: `servers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Server', 'Health'],
    }),

    // System commands
    executeCommand: builder.mutation<any, { serverId: string; command: string }>({
      query: ({ serverId, command }) => ({
        url: 'system/command',
        method: 'POST',
        body: { serverId, command },
      }),
    }),

    // Dashboard
    getDashboardData: builder.query<any, void>({
      query: () => 'dashboard',
      providesTags: ['Server', 'Alert', 'Health'],
    }),

    // Reports
    generateReport: builder.mutation<any, { type: string; filters: any; format: string }>({
      query: (body) => ({
        url: 'reports/generate',
        method: 'POST',
        body,
      }),
      providesTags: ['Report'],
    }),

    getReports: builder.query<any[], void>({
      query: () => 'reports',
      providesTags: ['Report'],
    }),

    // Settings
    getUserSettings: builder.query<any, void>({
      query: () => 'settings',
      providesTags: ['Settings'],
    }),

    updateUserSettings: builder.mutation<any, any>({
      query: (settings) => ({
        url: 'settings',
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['Settings'],
    }),

    // Emergency SOS
    sendSOSAlert: builder.mutation<void, { message: string; location?: { lat: number; lng: number } }>({
      query: (body) => ({
        url: 'emergency/sos',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Alert'],
    }),

    getEmergencyContacts: builder.query<any[], void>({
      query: () => 'emergency/contacts',
      providesTags: ['Emergency'],
    }),

    updateEmergencyContacts: builder.mutation<void, any[]>({
      query: (contacts) => ({
        url: 'emergency/contacts',
        method: 'POST',
        body: contacts,
      }),
      invalidatesTags: ['Emergency'],
    }),

    // Dashboard
    getDashboard: builder.query<any, void>({
      query: () => 'dashboard',
      providesTags: ['Dashboard'],
    }),

    // Voice Commands
    processVoiceCommand: builder.mutation<any, { transcript: string; confidence: number; language?: string }>({
      query: (body) => ({
        url: 'voice/command',
        method: 'POST',
        body,
      }),
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Authentication
  useLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,

  // Health
  useGetSystemHealthQuery,

  // Alerts
  useGetAlertsQuery,
  useGetAlertQuery,
  useAcknowledgeAlertMutation,
  useResolveAlertMutation,

  // Servers
  useGetServersQuery,
  useGetServerByIdQuery,
  useAddServerMutation,
  useUpdateServerMutation,
  useDeleteServerMutation,

  // System
  useExecuteCommandMutation,

  // Dashboard
  useGetDashboardDataQuery,
  useGetDashboardQuery,

  // Reports
  useGenerateReportMutation,
  useGetReportsQuery,

  // Settings
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,

  // Emergency
  useSendSOSAlertMutation,
  useGetEmergencyContactsQuery,
  useUpdateEmergencyContactsMutation,

  // Voice
  useProcessVoiceCommandMutation,
} = samsApi;
