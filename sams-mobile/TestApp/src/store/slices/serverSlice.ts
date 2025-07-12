import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Server } from '../api/samsApi';

interface ServerState {
  servers: Server[];
  filteredServers: Server[];
  selectedServer: Server | null;
  filters: {
    status: 'all' | 'online' | 'offline' | 'warning';
    type: 'all' | 'windows' | 'linux' | 'mac';
  };
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
}

const initialState: ServerState = {
  servers: [],
  filteredServers: [],
  selectedServer: null,
  filters: {
    status: 'all',
    type: 'all',
  },
  searchQuery: '',
  isLoading: false,
  error: null,
  lastUpdate: null,
};

const serverSlice = createSlice({
  name: 'servers',
  initialState,
  reducers: {
    setServers: (state, action: PayloadAction<Server[]>) => {
      state.servers = action.payload;
      state.lastUpdate = new Date().toISOString();
      applyFilters(state);
    },
    addServer: (state, action: PayloadAction<Server>) => {
      state.servers.push(action.payload);
      applyFilters(state);
    },
    updateServer: (state, action: PayloadAction<Server>) => {
      const index = state.servers.findIndex(server => server.id === action.payload.id);
      if (index !== -1) {
        state.servers[index] = action.payload;
        applyFilters(state);
      }
    },
    removeServer: (state, action: PayloadAction<string>) => {
      state.servers = state.servers.filter(server => server.id !== action.payload);
      applyFilters(state);
    },
    setSelectedServer: (state, action: PayloadAction<Server | null>) => {
      state.selectedServer = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<'all' | 'online' | 'offline' | 'warning'>) => {
      state.filters.status = action.payload;
      applyFilters(state);
    },
    setTypeFilter: (state, action: PayloadAction<'all' | 'windows' | 'linux' | 'mac'>) => {
      state.filters.type = action.payload;
      applyFilters(state);
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      applyFilters(state);
    },
    clearFilters: (state) => {
      state.filters = {
        status: 'all',
        type: 'all',
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
function applyFilters(state: ServerState) {
  let filtered = [...state.servers];

  // Apply status filter
  if (state.filters.status !== 'all') {
    filtered = filtered.filter(server => server.status === state.filters.status);
  }

  // Apply type filter
  if (state.filters.type !== 'all') {
    filtered = filtered.filter(server => server.type === state.filters.type);
  }

  // Apply search query
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(server =>
      server.name.toLowerCase().includes(query) ||
      server.ip.toLowerCase().includes(query) ||
      server.description.toLowerCase().includes(query)
    );
  }

  state.filteredServers = filtered;
}

export const {
  setServers,
  addServer,
  updateServer,
  removeServer,
  setSelectedServer,
  setStatusFilter,
  setTypeFilter,
  setSearchQuery,
  clearFilters,
  setLoading,
  setError,
} = serverSlice.actions;

export default serverSlice.reducer;
