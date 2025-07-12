import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Alert } from '../api/samsApi';

interface AlertState {
  alerts: Alert[];
  filteredAlerts: Alert[];
  selectedAlert: Alert | null;
  filters: {
    severity: 'all' | 'critical' | 'warning' | 'info';
    status: 'all' | 'unacknowledged' | 'acknowledged' | 'resolved';
    server: string;
  };
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
}

const initialState: AlertState = {
  alerts: [],
  filteredAlerts: [],
  selectedAlert: null,
  filters: {
    severity: 'all',
    status: 'all',
    server: '',
  },
  searchQuery: '',
  isLoading: false,
  error: null,
  lastUpdate: null,
};

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setAlerts: (state, action: PayloadAction<Alert[]>) => {
      state.alerts = action.payload;
      state.lastUpdate = new Date().toISOString();
      applyFilters(state);
    },
    // Add alert from WebSocket or API, prevent duplicates
    addAlert: (state, action: PayloadAction<Alert>) => {
      const exists = state.alerts.some(alert => alert.id === action.payload.id);
      if (!exists) {
        state.alerts.unshift(action.payload);
        applyFilters(state);
      }
    },
    updateAlert: (state, action: PayloadAction<Alert>) => {
      const index = state.alerts.findIndex(alert => alert.id === action.payload.id);
      if (index !== -1) {
        state.alerts[index] = action.payload;
        applyFilters(state);
      }
    },
    removeAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
      applyFilters(state);
    },
    setSelectedAlert: (state, action: PayloadAction<Alert | null>) => {
      state.selectedAlert = action.payload;
    },
    setSeverityFilter: (state, action: PayloadAction<'all' | 'critical' | 'warning' | 'info'>) => {
      state.filters.severity = action.payload;
      applyFilters(state);
    },
    setStatusFilter: (state, action: PayloadAction<'all' | 'unacknowledged' | 'acknowledged' | 'resolved'>) => {
      state.filters.status = action.payload;
      applyFilters(state);
    },
    setServerFilter: (state, action: PayloadAction<string>) => {
      state.filters.server = action.payload;
      applyFilters(state);
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      applyFilters(state);
    },
    clearFilters: (state) => {
      state.filters = {
        severity: 'all',
        status: 'all',
        server: '',
      };
      state.searchQuery = '';
      applyFilters(state);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

// Helper function to apply filters
function applyFilters(state: AlertState) {
  let filtered = [...state.alerts];

  // Apply severity filter
  if (state.filters.severity !== 'all') {
    filtered = filtered.filter(alert => alert.severity === state.filters.severity);
  }

  // Apply status filter
  if (state.filters.status !== 'all') {
    switch (state.filters.status) {
      case 'unacknowledged':
        filtered = filtered.filter(alert => !alert.acknowledged);
        break;
      case 'acknowledged':
        filtered = filtered.filter(alert => alert.acknowledged && !alert.resolved);
        break;
      case 'resolved':
        filtered = filtered.filter(alert => alert.resolved);
        break;
    }
  }

  // Apply server filter
  if (state.filters.server) {
    filtered = filtered.filter(alert => 
      alert.server.toLowerCase().includes(state.filters.server.toLowerCase())
    );
  }

  // Apply search query
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(alert =>
      alert.title.toLowerCase().includes(query) ||
      alert.description.toLowerCase().includes(query) ||
      alert.server.toLowerCase().includes(query)
    );
  }

  state.filteredAlerts = filtered;
}

export const {
  setAlerts,
  addAlert,
  updateAlert,
  removeAlert,
  setSelectedAlert,
  setSeverityFilter,
  setStatusFilter,
  setServerFilter,
  setSearchQuery,
  clearFilters,
  setLoading,
  setError,
} = alertSlice.actions;

export default alertSlice.reducer;
