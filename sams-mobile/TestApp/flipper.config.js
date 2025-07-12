/**
 * 🐬 Flipper Configuration
 * Development debugging and monitoring configuration
 */

module.exports = {
  // Flipper plugins configuration
  plugins: [
    // Core React Native plugins
    'React',
    'Metro',
    'Hermes Debugger',
    
    // Network debugging
    'Network',
    'Fresco',
    
    // Database debugging
    'Databases',
    'SharedPreferences',
    
    // Layout debugging
    'Layout',
    'Inspector',
    
    // Performance monitoring
    'Performance',
    'Memory',
    'CPU',
    
    // Crash reporting
    'CrashReporter',
    
    // Custom SAMS plugins
    'SAMS-API-Monitor',
    'SAMS-Alert-Tracker',
    'SAMS-Performance-Monitor',
  ],

  // Custom plugin configurations
  customPlugins: {
    'SAMS-API-Monitor': {
      enabled: true,
      trackRequests: true,
      trackResponses: true,
      trackErrors: true,
      maxLogEntries: 1000,
    },
    'SAMS-Alert-Tracker': {
      enabled: true,
      trackAlertCreation: true,
      trackAlertAcknowledgment: true,
      trackAlertResolution: true,
      maxAlertHistory: 500,
    },
    'SAMS-Performance-Monitor': {
      enabled: true,
      trackScreenTransitions: true,
      trackAPIResponseTimes: true,
      trackMemoryUsage: true,
      trackBatteryUsage: true,
    },
  },

  // Development environment settings
  development: {
    enabled: __DEV__,
    autoConnect: true,
    host: 'localhost',
    port: 8097,
    secure: false,
  },

  // Production settings (disabled)
  production: {
    enabled: false,
    crashReportingOnly: true,
  },

  // Security settings
  security: {
    allowUnsecureConnections: __DEV__,
    certificatePinning: !__DEV__,
    enableSSL: !__DEV__,
  },

  // Logging configuration
  logging: {
    level: __DEV__ ? 'debug' : 'error',
    enableConsoleLogging: __DEV__,
    enableFileLogging: true,
    maxLogFileSize: '10MB',
    logRetentionDays: 7,
  },

  // Performance monitoring
  performance: {
    enableFPSMonitoring: __DEV__,
    enableMemoryMonitoring: __DEV__,
    enableNetworkMonitoring: true,
    enableCrashReporting: true,
    sampleRate: __DEV__ ? 1.0 : 0.1,
  },

  // Feature flags
  features: {
    enableReduxDevTools: __DEV__,
    enableReactDevTools: __DEV__,
    enableNetworkInspector: __DEV__,
    enableLayoutInspector: __DEV__,
    enablePerformanceProfiler: __DEV__,
  },
};
