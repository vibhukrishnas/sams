import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';

interface CrashReport {
  id: string;
  timestamp: number;
  type: 'javascript_error' | 'native_crash' | 'unhandled_promise' | 'memory_error' | 'network_error';
  message: string;
  stack?: string;
  componentStack?: string;
  deviceInfo: DeviceInfo;
  appState: AppStateInfo;
  userActions: UserAction[];
  breadcrumbs: Breadcrumb[];
  customData: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  reportedAt?: number;
}

interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  brand: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  bundleId: string;
  isEmulator: boolean;
  totalMemory: number;
  freeMemory: number;
  batteryLevel: number;
  networkType: string;
  diskSpace: number;
}

interface AppStateInfo {
  currentScreen: string;
  previousScreen: string;
  sessionDuration: number;
  memoryUsage: number;
  isBackground: boolean;
  orientation: string;
}

interface UserAction {
  id: string;
  timestamp: number;
  type: 'tap' | 'swipe' | 'navigation' | 'api_call' | 'voice_command';
  target: string;
  data: any;
}

interface Breadcrumb {
  id: string;
  timestamp: number;
  category: 'navigation' | 'user_action' | 'network' | 'state_change' | 'error';
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: any;
}

interface CrashReportingConfig {
  enabled: boolean;
  maxReports: number;
  maxBreadcrumbs: number;
  maxUserActions: number;
  autoReport: boolean;
  reportingEndpoint?: string;
  apiKey?: string;
  userId?: string;
  sessionId: string;
}

class CrashReportingService {
  private static instance: CrashReportingService;
  private config: CrashReportingConfig;
  private reports: CrashReport[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private userActions: UserAction[] = [];
  private currentScreen = 'Unknown';
  private previousScreen = 'Unknown';
  private sessionStartTime = Date.now();
  private isInitialized = false;

  constructor() {
    this.config = {
      enabled: true,
      maxReports: 50,
      maxBreadcrumbs: 100,
      maxUserActions: 50,
      autoReport: true,
      sessionId: this.generateSessionId(),
    };
  }

  static getInstance(): CrashReportingService {
    if (!CrashReportingService.instance) {
      CrashReportingService.instance = new CrashReportingService();
    }
    return CrashReportingService.instance;
  }

  /**
   * Initialize crash reporting
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🛡️ Initializing crash reporting...');

    try {
      await this.loadConfiguration();
      await this.loadStoredReports();
      this.setupErrorHandlers();
      this.setupBreadcrumbTracking();
      
      this.isInitialized = true;
      console.log('✅ Crash reporting initialized');
      
      this.addBreadcrumb({
        category: 'state_change',
        message: 'Crash reporting initialized',
        level: 'info',
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize crash reporting:', error);
    }
  }

  /**
   * Load configuration
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('crash_reporting_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load crash reporting config:', error);
    }
  }

  /**
   * Load stored reports
   */
  private async loadStoredReports(): Promise<void> {
    try {
      const storedReports = await AsyncStorage.getItem('crash_reports');
      if (storedReports) {
        this.reports = JSON.parse(storedReports);
      }
    } catch (error) {
      console.warn('Failed to load stored crash reports:', error);
    }
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    // JavaScript errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      this.reportError(new Error(message), 'javascript_error');
      originalConsoleError.apply(console, args);
    };

    // Unhandled promise rejections
    if (typeof global !== 'undefined') {
      global.addEventListener?.('unhandledrejection', (event) => {
        this.reportError(
          new Error(`Unhandled Promise Rejection: ${event.reason}`),
          'unhandled_promise'
        );
      });
    }

    // React error boundary integration
    this.setupReactErrorBoundary();
  }

  /**
   * Setup React error boundary integration
   */
  private setupReactErrorBoundary(): void {
    // This would be called from your error boundary component
    (global as any).__CRASH_REPORTING_SERVICE__ = this;
  }

  /**
   * Setup breadcrumb tracking
   */
  private setupBreadcrumbTracking(): void {
    // App state changes
    AppState.addEventListener('change', (nextAppState) => {
      this.addBreadcrumb({
        category: 'state_change',
        message: `App state changed to ${nextAppState}`,
        level: 'info',
        data: { appState: nextAppState },
      });
    });

    // Network state changes
    NetInfo.addEventListener((state) => {
      this.addBreadcrumb({
        category: 'network',
        message: `Network state changed: ${state.type} (${state.isConnected ? 'connected' : 'disconnected'})`,
        level: 'info',
        data: state,
      });
    });
  }

  /**
   * Report an error/crash
   */
  async reportError(
    error: Error,
    type: CrashReport['type'] = 'javascript_error',
    customData: Record<string, any> = {}
  ): Promise<string> {
    if (!this.config.enabled) return '';

    const reportId = this.generateReportId();
    
    try {
      const deviceInfo = await this.collectDeviceInfo();
      const appState = await this.collectAppState();
      
      const report: CrashReport = {
        id: reportId,
        timestamp: Date.now(),
        type,
        message: error.message,
        stack: error.stack,
        deviceInfo,
        appState,
        userActions: [...this.userActions],
        breadcrumbs: [...this.breadcrumbs],
        customData,
        severity: this.determineSeverity(error, type),
        resolved: false,
      };

      // Add component stack if available
      if ((error as any).componentStack) {
        report.componentStack = (error as any).componentStack;
      }

      this.reports.push(report);
      
      // Limit stored reports
      if (this.reports.length > this.config.maxReports) {
        this.reports = this.reports.slice(-this.config.maxReports);
      }

      await this.saveReports();
      
      // Auto-report if enabled
      if (this.config.autoReport) {
        await this.sendReport(report);
      }

      console.error(`🚨 Crash reported: ${reportId}`, {
        type,
        message: error.message,
        severity: report.severity,
      });

      this.addBreadcrumb({
        category: 'error',
        message: `Crash reported: ${error.message}`,
        level: 'error',
        data: { reportId, type },
      });

      return reportId;
      
    } catch (reportingError) {
      console.error('Failed to report crash:', reportingError);
      return '';
    }
  }

  /**
   * Report React component error
   */
  reportComponentError(
    error: Error,
    errorInfo: { componentStack: string },
    customData: Record<string, any> = {}
  ): Promise<string> {
    const enhancedError = error as any;
    enhancedError.componentStack = errorInfo.componentStack;
    
    return this.reportError(enhancedError, 'javascript_error', {
      ...customData,
      errorBoundary: true,
    });
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'id' | 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      id: this.generateBreadcrumbId(),
      timestamp: Date.now(),
      ...breadcrumb,
    };

    this.breadcrumbs.push(fullBreadcrumb);
    
    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Track user action
   */
  trackUserAction(action: Omit<UserAction, 'id' | 'timestamp'>): void {
    const fullAction: UserAction = {
      id: this.generateActionId(),
      timestamp: Date.now(),
      ...action,
    };

    this.userActions.push(fullAction);
    
    // Limit user actions
    if (this.userActions.length > this.config.maxUserActions) {
      this.userActions = this.userActions.slice(-this.config.maxUserActions);
    }

    // Also add as breadcrumb
    this.addBreadcrumb({
      category: 'user_action',
      message: `User ${action.type}: ${action.target}`,
      level: 'info',
      data: action.data,
    });
  }

  /**
   * Set current screen
   */
  setCurrentScreen(screenName: string): void {
    this.previousScreen = this.currentScreen;
    this.currentScreen = screenName;
    
    this.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${screenName}`,
      level: 'info',
      data: { from: this.previousScreen, to: screenName },
    });
  }

  /**
   * Collect device information
   */
  private async collectDeviceInfo(): Promise<DeviceInfo> {
    try {
      const [
        model,
        brand,
        systemVersion,
        appVersion,
        buildNumber,
        bundleId,
        isEmulator,
        totalMemory,
        freeMemory,
        batteryLevel,
        networkState,
        diskSpace,
      ] = await Promise.all([
        DeviceInfo.getModel(),
        DeviceInfo.getBrand(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getBundleId(),
        DeviceInfo.isEmulator(),
        DeviceInfo.getTotalMemory(),
        DeviceInfo.getUsedMemory(),
        DeviceInfo.getBatteryLevel(),
        NetInfo.fetch(),
        DeviceInfo.getFreeDiskStorage(),
      ]);

      return {
        platform: Platform.OS,
        version: Platform.Version.toString(),
        model,
        brand,
        systemVersion,
        appVersion,
        buildNumber,
        bundleId,
        isEmulator,
        totalMemory,
        freeMemory: totalMemory - freeMemory,
        batteryLevel: batteryLevel * 100,
        networkType: networkState.type || 'unknown',
        diskSpace,
      };
    } catch (error) {
      console.warn('Failed to collect device info:', error);
      return {
        platform: Platform.OS,
        version: Platform.Version.toString(),
        model: 'Unknown',
        brand: 'Unknown',
        systemVersion: 'Unknown',
        appVersion: 'Unknown',
        buildNumber: 'Unknown',
        bundleId: 'Unknown',
        isEmulator: false,
        totalMemory: 0,
        freeMemory: 0,
        batteryLevel: 0,
        networkType: 'unknown',
        diskSpace: 0,
      };
    }
  }

  /**
   * Collect app state information
   */
  private async collectAppState(): Promise<AppStateInfo> {
    try {
      const memoryUsage = await DeviceInfo.getUsedMemory();
      
      return {
        currentScreen: this.currentScreen,
        previousScreen: this.previousScreen,
        sessionDuration: Date.now() - this.sessionStartTime,
        memoryUsage,
        isBackground: AppState.currentState !== 'active',
        orientation: 'portrait', // Would need orientation detection
      };
    } catch (error) {
      return {
        currentScreen: this.currentScreen,
        previousScreen: this.previousScreen,
        sessionDuration: Date.now() - this.sessionStartTime,
        memoryUsage: 0,
        isBackground: false,
        orientation: 'unknown',
      };
    }
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, type: CrashReport['type']): CrashReport['severity'] {
    // Critical errors
    if (type === 'native_crash' || type === 'memory_error') {
      return 'critical';
    }
    
    // High severity errors
    if (error.message.toLowerCase().includes('network') && type === 'network_error') {
      return 'medium';
    }
    
    if (error.stack?.includes('componentDidCatch') || error.stack?.includes('ErrorBoundary')) {
      return 'high';
    }
    
    // Check for specific error patterns
    const criticalPatterns = [
      'cannot read property',
      'undefined is not a function',
      'null is not an object',
      'maximum call stack',
    ];
    
    if (criticalPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    )) {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * Send report to server
   */
  private async sendReport(report: CrashReport): Promise<boolean> {
    if (!this.config.reportingEndpoint) {
      console.log('📤 No reporting endpoint configured, storing locally');
      return false;
    }

    try {
      const response = await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : '',
        },
        body: JSON.stringify({
          ...report,
          userId: this.config.userId,
          sessionId: this.config.sessionId,
        }),
      });

      if (response.ok) {
        report.reportedAt = Date.now();
        await this.saveReports();
        console.log(`✅ Crash report ${report.id} sent successfully`);
        return true;
      } else {
        console.warn(`Failed to send crash report: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.warn('Failed to send crash report:', error);
      return false;
    }
  }

  /**
   * Save reports to storage
   */
  private async saveReports(): Promise<void> {
    try {
      await AsyncStorage.setItem('crash_reports', JSON.stringify(this.reports));
    } catch (error) {
      console.warn('Failed to save crash reports:', error);
    }
  }

  /**
   * Get all reports
   */
  getReports(): CrashReport[] {
    return [...this.reports];
  }

  /**
   * Get unresolved reports
   */
  getUnresolvedReports(): CrashReport[] {
    return this.reports.filter(report => !report.resolved);
  }

  /**
   * Mark report as resolved
   */
  async markReportResolved(reportId: string): Promise<void> {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      report.resolved = true;
      await this.saveReports();
    }
  }

  /**
   * Clear all reports
   */
  async clearReports(): Promise<void> {
    this.reports = [];
    await AsyncStorage.removeItem('crash_reports');
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<CrashReportingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('crash_reporting_config', JSON.stringify(this.config));
  }

  /**
   * Generate unique IDs
   */
  private generateReportId(): string {
    return `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBreadcrumbId(): string {
    return `breadcrumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get crash statistics
   */
  getCrashStatistics(): any {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    const last7Days = now - (7 * 24 * 60 * 60 * 1000);

    const recent24h = this.reports.filter(r => r.timestamp > last24Hours);
    const recent7d = this.reports.filter(r => r.timestamp > last7Days);

    return {
      total: this.reports.length,
      unresolved: this.getUnresolvedReports().length,
      last24Hours: recent24h.length,
      last7Days: recent7d.length,
      byType: this.reports.reduce((acc, report) => {
        acc[report.type] = (acc[report.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: this.reports.reduce((acc, report) => {
        acc[report.severity] = (acc[report.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export default CrashReportingService;
export { CrashReport, DeviceInfo, AppStateInfo, UserAction, Breadcrumb, CrashReportingConfig };
