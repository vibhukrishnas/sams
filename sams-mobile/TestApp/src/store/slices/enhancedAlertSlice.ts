import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

export interface EnhancedAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  server: string;
  serverId: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  acknowledgedBy?: string;
  resolvedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  notes?: string;
  resolution?: string;
  category: string;
  tags: string[];
  priority: number; // 1-10 scale
  snoozedUntil?: string;
  reminderAt?: string;
  escalationLevel: number;
  responseTime?: number;
  resolutionTime?: number;
  voiceNotes?: string[];
  attachments?: string[];
  relatedAlerts?: string[];
}

export interface AlertFilter {
  severity?: string[];
  status?: string[];
  server?: string[];
  category?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  priority?: {
    min: number;
    max: number;
  };
  searchQuery?: string;
  escalationLevel?: number[];
  snoozed?: boolean;
}

export interface AlertAnalytics {
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  resolvedAlerts: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  topServers: Array<{ serverId: string; serverName: string; alertCount: number }>;
  trendData: Array<{ date: string; count: number; severity: string }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  escalationStats: Array<{ level: number; count: number }>;
}

export interface VoiceResponse {
  alertId: string;
  transcript: string;
  action: 'acknowledge' | 'resolve' | 'escalate' | 'snooze' | 'note';
  parameters?: any;
}

export interface EnhancedAlertState {
  alerts: EnhancedAlert[];
  filteredAlerts: EnhancedAlert[];
  selectedAlert: EnhancedAlert | null;
  filters: AlertFilter;
  analytics: AlertAnalytics | null;
  searchQuery: string;
  sortBy: 'timestamp' | 'severity' | 'priority' | 'server' | 'category';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  voiceRecording: boolean;
  voiceTranscript: string;
  voiceProcessing: boolean;
  bulkSelection: string[];
  viewMode: 'list' | 'grid' | 'timeline';
  autoRefresh: boolean;
  refreshInterval: number;
}

const initialState: EnhancedAlertState = {
  alerts: [],
  filteredAlerts: [],
  selectedAlert: null,
  filters: {},
  analytics: null,
  searchQuery: '',
  sortBy: 'timestamp',
  sortOrder: 'desc',
  isLoading: false,
  error: null,
  lastUpdated: null,
  voiceRecording: false,
  voiceTranscript: '',
  voiceProcessing: false,
  bulkSelection: [],
  viewMode: 'list',
  autoRefresh: true,
  refreshInterval: 30000,
};

// Async thunks for advanced alert operations
export const snoozeAlert = createAsyncThunk(
  'enhancedAlerts/snooze',
  async ({ alertId, duration, reason }: { alertId: string; duration: number; reason?: string }) => {
    const snoozedUntil = new Date(Date.now() + duration).toISOString();
    // API call would go here
    return { alertId, snoozedUntil, reason };
  }
);

export const setReminder = createAsyncThunk(
  'enhancedAlerts/setReminder',
  async ({ alertId, reminderTime, message }: { alertId: string; reminderTime: string; message?: string }) => {
    // API call would go here
    return { alertId, reminderTime, message };
  }
);

export const escalateAlert = createAsyncThunk(
  'enhancedAlerts/escalate',
  async ({ alertId, level, reason }: { alertId: string; level: number; reason?: string }) => {
    // API call would go here
    return { alertId, level, reason };
  }
);

export const processVoiceCommand = createAsyncThunk(
  'enhancedAlerts/processVoiceCommand',
  async ({ transcript, alertId }: { transcript: string; alertId?: string }) => {
    // Process voice command using NLP
    const response = await processVoiceToAction(transcript, alertId);
    return response;
  }
);

export const bulkUpdateAlerts = createAsyncThunk(
  'enhancedAlerts/bulkUpdate',
  async ({ alertIds, action, parameters }: { alertIds: string[]; action: string; parameters?: any }) => {
    // API call for bulk operations
    return { alertIds, action, parameters };
  }
);

export const generateAnalytics = createAsyncThunk(
  'enhancedAlerts/generateAnalytics',
  async ({ timeRange, filters }: { timeRange: string; filters?: AlertFilter }) => {
    // Generate analytics data
    const analytics = await calculateAnalytics(timeRange, filters);
    return analytics;
  }
);

const enhancedAlertSlice = createSlice({
  name: 'enhancedAlerts',
  initialState,
  reducers: {
    setAlerts: (state, action: PayloadAction<EnhancedAlert[]>) => {
      state.alerts = action.payload;
      state.filteredAlerts = applyFiltersAndSort(action.payload, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
      state.lastUpdated = new Date().toISOString();
    },
    
    addAlert: (state, action: PayloadAction<EnhancedAlert>) => {
      const exists = state.alerts.find(alert => alert.id === action.payload.id);
      if (!exists) {
        state.alerts.unshift(action.payload);
        state.filteredAlerts = applyFiltersAndSort(state.alerts, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
      }
    },
    
    updateAlert: (state, action: PayloadAction<Partial<EnhancedAlert> & { id: string }>) => {
      const index = state.alerts.findIndex(alert => alert.id === action.payload.id);
      if (index !== -1) {
        state.alerts[index] = { ...state.alerts[index], ...action.payload };
        state.filteredAlerts = applyFiltersAndSort(state.alerts, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
      }
    },
    
    acknowledgeAlert: (state, action: PayloadAction<{ id: string; userId: string; notes?: string; voiceNote?: string }>) => {
      const alert = state.alerts.find(a => a.id === action.payload.id);
      if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = action.payload.userId;
        alert.acknowledgedAt = new Date().toISOString();
        alert.responseTime = new Date().getTime() - new Date(alert.timestamp).getTime();
        if (action.payload.notes) alert.notes = action.payload.notes;
        if (action.payload.voiceNote) {
          alert.voiceNotes = alert.voiceNotes || [];
          alert.voiceNotes.push(action.payload.voiceNote);
        }
        state.filteredAlerts = applyFiltersAndSort(state.alerts, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
      }
    },
    
    resolveAlert: (state, action: PayloadAction<{ id: string; userId: string; resolution: string; voiceNote?: string }>) => {
      const alert = state.alerts.find(a => a.id === action.payload.id);
      if (alert) {
        alert.resolved = true;
        alert.resolvedBy = action.payload.userId;
        alert.resolvedAt = new Date().toISOString();
        alert.resolution = action.payload.resolution;
        alert.resolutionTime = alert.acknowledgedAt 
          ? new Date().getTime() - new Date(alert.acknowledgedAt).getTime()
          : new Date().getTime() - new Date(alert.timestamp).getTime();
        if (action.payload.voiceNote) {
          alert.voiceNotes = alert.voiceNotes || [];
          alert.voiceNotes.push(action.payload.voiceNote);
        }
        state.filteredAlerts = applyFiltersAndSort(state.alerts, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
      }
    },
    
    addVoiceNote: (state, action: PayloadAction<{ alertId: string; voiceNote: string }>) => {
      const alert = state.alerts.find(a => a.id === action.payload.alertId);
      if (alert) {
        alert.voiceNotes = alert.voiceNotes || [];
        alert.voiceNotes.push(action.payload.voiceNote);
      }
    },
    
    setFilters: (state, action: PayloadAction<AlertFilter>) => {
      state.filters = action.payload;
      state.filteredAlerts = applyFiltersAndSort(state.alerts, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.filteredAlerts = applyFiltersAndSort(state.alerts, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
    },
    
    setSorting: (state, action: PayloadAction<{ sortBy: EnhancedAlertState['sortBy']; sortOrder: EnhancedAlertState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
      state.filteredAlerts = applyFiltersAndSort(state.alerts, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
    },
    
    setSelectedAlert: (state, action: PayloadAction<EnhancedAlert | null>) => {
      state.selectedAlert = action.payload;
    },
    
    setVoiceRecording: (state, action: PayloadAction<boolean>) => {
      state.voiceRecording = action.payload;
    },
    
    setVoiceTranscript: (state, action: PayloadAction<string>) => {
      state.voiceTranscript = action.payload;
    },
    
    setVoiceProcessing: (state, action: PayloadAction<boolean>) => {
      state.voiceProcessing = action.payload;
    },
    
    clearVoiceTranscript: (state) => {
      state.voiceTranscript = '';
    },
    
    toggleBulkSelection: (state, action: PayloadAction<string>) => {
      const alertId = action.payload;
      const index = state.bulkSelection.indexOf(alertId);
      if (index > -1) {
        state.bulkSelection.splice(index, 1);
      } else {
        state.bulkSelection.push(alertId);
      }
    },
    
    clearBulkSelection: (state) => {
      state.bulkSelection = [];
    },
    
    selectAllFiltered: (state) => {
      state.bulkSelection = state.filteredAlerts.map(alert => alert.id);
    },
    
    setViewMode: (state, action: PayloadAction<EnhancedAlertState['viewMode']>) => {
      state.viewMode = action.payload;
    },
    
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefresh = action.payload;
    },
    
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(snoozeAlert.fulfilled, (state, action) => {
        const alert = state.alerts.find(a => a.id === action.payload.alertId);
        if (alert) {
          alert.snoozedUntil = action.payload.snoozedUntil;
          state.filteredAlerts = applyFiltersAndSort(state.alerts, state.filters, state.searchQuery, state.sortBy, state.sortOrder);
        }
      })
      .addCase(setReminder.fulfilled, (state, action) => {
        const alert = state.alerts.find(a => a.id === action.payload.alertId);
        if (alert) {
          alert.reminderAt = action.payload.reminderTime;
        }
      })
      .addCase(escalateAlert.fulfilled, (state, action) => {
        const alert = state.alerts.find(a => a.id === action.payload.alertId);
        if (alert) {
          alert.escalationLevel = action.payload.level;
        }
      })
      .addCase(processVoiceCommand.pending, (state) => {
        state.voiceProcessing = true;
      })
      .addCase(processVoiceCommand.fulfilled, (state, action) => {
        state.voiceProcessing = false;
        // Handle voice command result
      })
      .addCase(processVoiceCommand.rejected, (state) => {
        state.voiceProcessing = false;
      })
      .addCase(generateAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload;
      });
  },
});

// Helper functions
function applyFiltersAndSort(
  alerts: EnhancedAlert[], 
  filters: AlertFilter, 
  searchQuery: string, 
  sortBy: EnhancedAlertState['sortBy'], 
  sortOrder: EnhancedAlertState['sortOrder']
): EnhancedAlert[] {
  let filtered = applyFilters(alerts, filters, searchQuery);
  return applySorting(filtered, sortBy, sortOrder);
}

function applyFilters(alerts: EnhancedAlert[], filters: AlertFilter, searchQuery: string): EnhancedAlert[] {
  let filtered = [...alerts];
  
  // Apply search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(alert => 
      alert.title.toLowerCase().includes(query) ||
      alert.description.toLowerCase().includes(query) ||
      alert.server.toLowerCase().includes(query) ||
      alert.category.toLowerCase().includes(query) ||
      alert.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }
  
  // Apply severity filter
  if (filters.severity && filters.severity.length > 0) {
    filtered = filtered.filter(alert => filters.severity!.includes(alert.severity));
  }
  
  // Apply status filter
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter(alert => {
      if (filters.status!.includes('resolved')) return alert.resolved;
      if (filters.status!.includes('acknowledged')) return alert.acknowledged && !alert.resolved;
      if (filters.status!.includes('unacknowledged')) return !alert.acknowledged;
      return true;
    });
  }
  
  // Apply server filter
  if (filters.server && filters.server.length > 0) {
    filtered = filtered.filter(alert => filters.server!.includes(alert.serverId));
  }
  
  // Apply category filter
  if (filters.category && filters.category.length > 0) {
    filtered = filtered.filter(alert => filters.category!.includes(alert.category));
  }
  
  // Apply tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(alert => 
      filters.tags!.some(tag => alert.tags.includes(tag))
    );
  }
  
  // Apply date range filter
  if (filters.dateRange) {
    const start = new Date(filters.dateRange.start);
    const end = new Date(filters.dateRange.end);
    filtered = filtered.filter(alert => {
      const alertDate = new Date(alert.timestamp);
      return alertDate >= start && alertDate <= end;
    });
  }
  
  // Apply priority filter
  if (filters.priority) {
    filtered = filtered.filter(alert => 
      alert.priority >= filters.priority!.min && alert.priority <= filters.priority!.max
    );
  }
  
  // Apply escalation level filter
  if (filters.escalationLevel && filters.escalationLevel.length > 0) {
    filtered = filtered.filter(alert => filters.escalationLevel!.includes(alert.escalationLevel));
  }
  
  // Apply snoozed filter
  if (filters.snoozed !== undefined) {
    const now = new Date();
    filtered = filtered.filter(alert => {
      const isSnoozed = alert.snoozedUntil && new Date(alert.snoozedUntil) > now;
      return filters.snoozed ? isSnoozed : !isSnoozed;
    });
  }
  
  return filtered;
}

function applySorting(alerts: EnhancedAlert[], sortBy: EnhancedAlertState['sortBy'], sortOrder: EnhancedAlertState['sortOrder']): EnhancedAlert[] {
  const sorted = [...alerts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'timestamp':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'severity':
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
      case 'priority':
        comparison = a.priority - b.priority;
        break;
      case 'server':
        comparison = a.server.localeCompare(b.server);
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

// Voice processing helper
async function processVoiceToAction(transcript: string, alertId?: string): Promise<VoiceResponse> {
  // Simple NLP processing - in production, use a proper NLP service
  const lowerTranscript = transcript.toLowerCase();
  
  if (lowerTranscript.includes('acknowledge') || lowerTranscript.includes('ack')) {
    return { alertId: alertId || '', transcript, action: 'acknowledge' };
  } else if (lowerTranscript.includes('resolve') || lowerTranscript.includes('fix')) {
    return { alertId: alertId || '', transcript, action: 'resolve' };
  } else if (lowerTranscript.includes('escalate') || lowerTranscript.includes('urgent')) {
    return { alertId: alertId || '', transcript, action: 'escalate' };
  } else if (lowerTranscript.includes('snooze') || lowerTranscript.includes('later')) {
    const duration = extractDuration(lowerTranscript);
    return { alertId: alertId || '', transcript, action: 'snooze', parameters: { duration } };
  } else {
    return { alertId: alertId || '', transcript, action: 'note' };
  }
}

function extractDuration(transcript: string): number {
  // Extract duration from transcript (e.g., "5 minutes", "1 hour")
  const minuteMatch = transcript.match(/(\d+)\s*minute/);
  if (minuteMatch) return parseInt(minuteMatch[1]) * 60 * 1000;
  
  const hourMatch = transcript.match(/(\d+)\s*hour/);
  if (hourMatch) return parseInt(hourMatch[1]) * 60 * 60 * 1000;
  
  return 15 * 60 * 1000; // Default 15 minutes
}

// Analytics calculation helper
async function calculateAnalytics(timeRange: string, filters?: AlertFilter): Promise<AlertAnalytics> {
  // Mock analytics calculation - in production, this would call an API
  return {
    totalAlerts: 150,
    criticalAlerts: 25,
    warningAlerts: 75,
    infoAlerts: 50,
    resolvedAlerts: 120,
    averageResponseTime: 300000, // 5 minutes
    averageResolutionTime: 1800000, // 30 minutes
    topServers: [
      { serverId: '1', serverName: 'Web Server 1', alertCount: 45 },
      { serverId: '2', serverName: 'Database Server', alertCount: 32 },
      { serverId: '3', serverName: 'API Gateway', alertCount: 28 },
    ],
    trendData: [],
    categoryBreakdown: [
      { category: 'Performance', count: 60 },
      { category: 'Security', count: 40 },
      { category: 'Connectivity', count: 30 },
      { category: 'Storage', count: 20 },
    ],
    hourlyDistribution: [],
    escalationStats: [
      { level: 1, count: 100 },
      { level: 2, count: 35 },
      { level: 3, count: 15 },
    ],
  };
}

export const {
  setAlerts,
  addAlert,
  updateAlert,
  acknowledgeAlert,
  resolveAlert,
  addVoiceNote,
  setFilters,
  setSearchQuery,
  setSorting,
  setSelectedAlert,
  setVoiceRecording,
  setVoiceTranscript,
  setVoiceProcessing,
  clearVoiceTranscript,
  toggleBulkSelection,
  clearBulkSelection,
  selectAllFiltered,
  setViewMode,
  setAutoRefresh,
  setRefreshInterval,
  setLoading,
  setError,
} = enhancedAlertSlice.actions;

export default enhancedAlertSlice.reducer;
