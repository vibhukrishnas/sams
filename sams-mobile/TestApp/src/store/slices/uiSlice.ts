import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  theme: 'light' | 'dark';
  isDrawerOpen: boolean;
  activeTab: string;
  isLoading: boolean;
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  refreshInterval: number; // in seconds
  lastRefresh: string | null;
  networkStatus: 'online' | 'offline';
  toastMessage: {
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    action?: {
      label: string;
      onPress: () => void;
    };
  };
}

const initialState: UIState = {
  theme: 'light',
  isDrawerOpen: false,
  activeTab: 'Dashboard',
  isLoading: false,
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  refreshInterval: 30,
  lastRefresh: null,
  networkStatus: 'online',
  toastMessage: {
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    toggleDrawer: (state) => {
      state.isDrawerOpen = !state.isDrawerOpen;
    },
    setDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isDrawerOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setNotificationSettings: (state, action: PayloadAction<Partial<UIState['notifications']>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    setLastRefresh: (state, action: PayloadAction<string>) => {
      state.lastRefresh = action.payload;
    },
    setNetworkStatus: (state, action: PayloadAction<'online' | 'offline'>) => {
      state.networkStatus = action.payload;
    },
    showToast: (state, action: PayloadAction<{
      message: string;
      type: 'success' | 'error' | 'warning' | 'info';
      duration?: number;
      action?: { label: string; onPress: () => void };
    }>) => {
      state.toastMessage = {
        visible: true,
        message: action.payload.message,
        type: action.payload.type,
        duration: action.payload.duration || 3000,
        action: action.payload.action,
      };
    },
    hideToast: (state) => {
      state.toastMessage.visible = false;
    },
  },
});

export const {
  setTheme,
  toggleDrawer,
  setDrawerOpen,
  setActiveTab,
  setLoading,
  setNotificationSettings,
  setRefreshInterval,
  setLastRefresh,
  setNetworkStatus,
  showToast,
  hideToast,
} = uiSlice.actions;

export default uiSlice.reducer;
