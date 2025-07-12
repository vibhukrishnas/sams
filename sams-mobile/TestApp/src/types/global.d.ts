/**
 * 🌍 Global Type Definitions
 * Global types and interfaces for the SAMS mobile application
 */

declare global {
  // Environment variables
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      REACT_NATIVE_PACKAGER_HOSTNAME?: string;
      FLIPPER_DISABLE?: string;
      SAMS_API_URL?: string;
      SAMS_WS_URL?: string;
      FIREBASE_API_KEY?: string;
      FIREBASE_PROJECT_ID?: string;
      CODEPUSH_IOS_DEPLOYMENT_KEY?: string;
      CODEPUSH_ANDROID_DEPLOYMENT_KEY?: string;
    }
  }

  // React Native global variables
  var __DEV__: boolean;
  var __BUNDLE_START_TIME__: number;
  var __METRO_GLOBAL_PREFIX__: string;

  // Flipper integration
  interface Window {
    __FLIPPER__?: any;
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any;
  }

  // Native modules
  interface NativeModules {
    // Custom native modules
    SAMSNativeModule?: {
      getDeviceInfo(): Promise<DeviceInfo>;
      enableBiometrics(): Promise<boolean>;
      showSecurityAlert(message: string): void;
      optimizeBattery(): Promise<void>;
    };

    // Widget modules
    WidgetKit?: {
      updateWidget(id: string, data: any): Promise<void>;
      removeWidget(id: string): Promise<void>;
    };

    AndroidWidget?: {
      updateWidget(id: string, data: any): Promise<void>;
      removeWidget(id: string): Promise<void>;
    };

    // Wearable modules
    WatchConnectivity?: {
      isSupported(): Promise<boolean>;
      isPaired(): Promise<boolean>;
      isReachable(): Promise<boolean>;
      sendMessage(data: any): Promise<void>;
      updateApplicationContext(data: any): Promise<void>;
    };

    WearableAPI?: {
      getConnectedNodes(): Promise<WearableNode[]>;
      sendMessage(nodeId: string, path: string, data: string): Promise<void>;
    };
  }

  // Custom JSX elements
  namespace JSX {
    interface IntrinsicElements {
      'sams-widget': any;
      'sams-chart': any;
      'sams-metric': any;
    }
  }
}

// Device information
export interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  platform: 'ios' | 'android';
  version: string;
  buildNumber: string;
  bundleId: string;
  isEmulator: boolean;
  hasNotch: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelDensity: number;
  fontScale: number;
  batteryLevel?: number;
  isCharging?: boolean;
  networkType?: string;
  carrierName?: string;
  timeZone: string;
  locale: string;
  isRooted?: boolean;
  isJailbroken?: boolean;
}

// Wearable types
export interface WearableNode {
  id: string;
  displayName: string;
  isNearby: boolean;
  capabilities: string[];
}

// Navigation types
export type RootStackParamList = {
  // Auth screens
  Login: undefined;
  PinSetup: undefined;
  BiometricSetup: undefined;

  // Main app screens
  MainTabs: undefined;
  Dashboard: undefined;
  Alerts: undefined;
  Servers: undefined;
  Reports: undefined;
  Settings: undefined;

  // Detail screens
  AlertDetails: { alertId: string };
  ServerDetails: { serverId: string };
  AddServer: undefined;
  EditServer: { serverId: string };
  About: undefined;
  Profile: undefined;
  Help: undefined;

  // Modal screens
  EmergencySOS: undefined;
  VoiceCommand: undefined;
  QRScanner: undefined;
  ReportViewer: { reportId: string };
};

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Alert types
export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info' | 'low';
  status: 'active' | 'acknowledged' | 'resolved' | 'snoozed';
  serverId: string;
  serverName: string;
  timestamp: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  snoozedUntil?: string;
  escalated: boolean;
  tags: string[];
  metadata: Record<string, any>;
}

// Server types
export interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  type: 'linux' | 'windows' | 'macos' | 'other';
  status: 'online' | 'offline' | 'maintenance' | 'unknown';
  lastSeen: string;
  uptime: number;
  location?: string;
  description?: string;
  tags: string[];
  metrics: ServerMetrics;
  agent: AgentInfo;
}

export interface ServerMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  processes: number;
  loadAverage: number[];
  temperature?: number;
  timestamp: string;
}

export interface AgentInfo {
  version: string;
  status: 'running' | 'stopped' | 'error' | 'updating';
  lastHeartbeat: string;
  capabilities: string[];
  config: Record<string, any>;
}

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  organizationId: string;
  avatar?: string;
  lastLogin: string;
  createdAt: string;
  preferences: UserPreferences;
  permissions: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    sound: boolean;
    vibration: boolean;
  };
  dashboard: {
    refreshInterval: number;
    defaultView: string;
    widgets: string[];
  };
  alerts: {
    autoAcknowledge: boolean;
    soundEnabled: boolean;
    severityFilter: string[];
  };
}

// Widget types
export interface WidgetData {
  id: string;
  type: 'server_status' | 'alert_count' | 'system_health' | 'quick_stats';
  title: string;
  data: any;
  lastUpdated: number;
  refreshInterval: number;
}

// Performance types
export interface PerformanceMetrics {
  appStartTime: number;
  screenTransitionTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  batteryUsage: number;
  networkUsage: {
    bytesReceived: number;
    bytesSent: number;
  };
  crashCount: number;
  errorCount: number;
  timestamp: string;
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    fontWeight: {
      light: string;
      normal: string;
      medium: string;
      bold: string;
    };
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Nullable<T> = T | null;

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;

// Export all types
export * from './api';
export * from './navigation';
export * from './store';
export * from './components';
export * from './services';
