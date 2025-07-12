import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hooks for common selectors
export const useAuth = () => {
  return useAppSelector((state) => state.auth);
};

export const useServers = () => {
  return useAppSelector((state) => state.servers);
};

export const useAlerts = () => {
  return useAppSelector((state) => state.alerts);
};

export const useUI = () => {
  return useAppSelector((state) => state.ui);
};

export const useSettings = () => {
  return useAppSelector((state) => state.settings);
};

export const useOffline = () => {
  return useAppSelector((state) => state.offline);
};

// Computed selectors
export const useIsAuthenticated = () => {
  return useAppSelector((state) => state.auth.isAuthenticated);
};

export const useCurrentUser = () => {
  return useAppSelector((state) => state.auth.user);
};

export const useTheme = () => {
  return useAppSelector((state) => state.settings.app.theme);
};

export const useNetworkStatus = () => {
  return useAppSelector((state) => state.offline.isOnline);
};

export const usePendingActions = () => {
  return useAppSelector((state) => state.offline.queuedActions.length);
};

export const useCriticalAlerts = () => {
  return useAppSelector((state) =>
    state.alerts.alerts.filter(alert => alert.severity === 'critical' && !alert.resolved)
  );
};

export const useOnlineServers = () => {
  return useAppSelector((state) =>
    state.servers.servers.filter(server => server.status === 'online')
  );
};

export const useOfflineServers = () => {
  return useAppSelector((state) =>
    state.servers.servers.filter(server => server.status === 'offline')
  );
};
