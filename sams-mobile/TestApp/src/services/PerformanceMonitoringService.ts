import { Platform, InteractionManager, AppState, DeviceEventEmitter } from 'react-native';
import { performance } from 'perf_hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-netinfo/netinfo';

interface PerformanceMetrics {
  appStartTime: number;
  screenTransitionTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  batteryLevel: number;
  networkLatency: number;
  frameDrops: number;
  crashCount: number;
  errorCount: number;
}

interface PerformanceEvent {
  id: string;
  type: 'app_start' | 'screen_transition' | 'api_call' | 'error' | 'crash' | 'memory_warning';
  timestamp: number;
  duration?: number;
  metadata: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceConfig {
  enableMonitoring: boolean;
  sampleRate: number;
  maxEvents: number;
  reportingInterval: number;
  thresholds: {
    appStartTime: number;
    screenTransitionTime: number;
    apiResponseTime: number;
    memoryUsage: number;
    batteryDrain: number;
  };
}

class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private config: PerformanceConfig;
  private events: PerformanceEvent[] = [];
  private metrics: PerformanceMetrics;
  private startTimes: Map<string, number> = new Map();
  private isMonitoring = false;
  private reportingTimer?: NodeJS.Timeout;
  private memoryWarningListener?: any;
  private appStateListener?: any;

  constructor() {
    this.config = {
      enableMonitoring: true,
      sampleRate: 1.0, // 100% sampling in development, reduce in production
      maxEvents: 1000,
      reportingInterval: 60000, // 1 minute
      thresholds: {
        appStartTime: 3000, // 3 seconds
        screenTransitionTime: 500, // 500ms
        apiResponseTime: 2000, // 2 seconds
        memoryUsage: 200 * 1024 * 1024, // 200MB
        batteryDrain: 5, // 5% per hour
      },
    };

    this.metrics = {
      appStartTime: 0,
      screenTransitionTime: 0,
      apiResponseTime: 0,
      memoryUsage: 0,
      batteryLevel: 100,
      networkLatency: 0,
      frameDrops: 0,
      crashCount: 0,
      errorCount: 0,
    };
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Initialize performance monitoring
   */
  async initialize(): Promise<void> {
    if (this.isMonitoring) return;

    console.log('🚀 Initializing performance monitoring...');

    try {
      await this.loadConfiguration();
      this.setupEventListeners();
      this.startPeriodicReporting();
      this.measureAppStartTime();
      
      this.isMonitoring = true;
      console.log('✅ Performance monitoring initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('performance_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load performance config:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Memory warning listener
    this.memoryWarningListener = DeviceEventEmitter.addListener(
      'memoryWarning',
      this.handleMemoryWarning.bind(this)
    );

    // App state change listener
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    // Global error handler
    this.setupErrorHandling();
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    // JavaScript errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.recordError('javascript_error', args.join(' '));
      originalConsoleError.apply(console, args);
    };

    // Unhandled promise rejections
    if (typeof global !== 'undefined') {
      global.addEventListener?.('unhandledrejection', (event) => {
        this.recordError('unhandled_promise_rejection', event.reason);
      });
    }
  }

  /**
   * Measure app start time
   */
  private measureAppStartTime(): void {
    const startTime = Date.now();
    
    InteractionManager.runAfterInteractions(() => {
      const appStartTime = Date.now() - startTime;
      this.metrics.appStartTime = appStartTime;
      
      this.recordEvent({
        id: `app_start_${Date.now()}`,
        type: 'app_start',
        timestamp: Date.now(),
        duration: appStartTime,
        metadata: {
          platform: Platform.OS,
          version: Platform.Version,
        },
        severity: appStartTime > this.config.thresholds.appStartTime ? 'high' : 'low',
      });
    });
  }

  /**
   * Start screen transition measurement
   */
  startScreenTransition(screenName: string): void {
    if (!this.shouldSample()) return;
    
    const transitionId = `screen_${screenName}_${Date.now()}`;
    this.startTimes.set(transitionId, performance.now());
  }

  /**
   * End screen transition measurement
   */
  endScreenTransition(screenName: string): void {
    if (!this.shouldSample()) return;
    
    const transitionId = Array.from(this.startTimes.keys())
      .find(key => key.includes(`screen_${screenName}`));
    
    if (transitionId) {
      const startTime = this.startTimes.get(transitionId);
      if (startTime) {
        const duration = performance.now() - startTime;
        this.metrics.screenTransitionTime = duration;
        
        this.recordEvent({
          id: `transition_${screenName}_${Date.now()}`,
          type: 'screen_transition',
          timestamp: Date.now(),
          duration,
          metadata: { screenName },
          severity: duration > this.config.thresholds.screenTransitionTime ? 'medium' : 'low',
        });
        
        this.startTimes.delete(transitionId);
      }
    }
  }

  /**
   * Start API call measurement
   */
  startApiCall(endpoint: string): string {
    if (!this.shouldSample()) return '';
    
    const callId = `api_${endpoint}_${Date.now()}`;
    this.startTimes.set(callId, performance.now());
    return callId;
  }

  /**
   * End API call measurement
   */
  endApiCall(callId: string, endpoint: string, success: boolean, statusCode?: number): void {
    if (!callId || !this.shouldSample()) return;
    
    const startTime = this.startTimes.get(callId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.apiResponseTime = duration;
      
      this.recordEvent({
        id: callId,
        type: 'api_call',
        timestamp: Date.now(),
        duration,
        metadata: {
          endpoint,
          success,
          statusCode,
        },
        severity: duration > this.config.thresholds.apiResponseTime ? 'medium' : 'low',
      });
      
      this.startTimes.delete(callId);
    }
  }

  /**
   * Record performance event
   */
  private recordEvent(event: PerformanceEvent): void {
    if (!this.config.enableMonitoring) return;
    
    this.events.push(event);
    
    // Limit events to prevent memory issues
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }
    
    // Log critical events immediately
    if (event.severity === 'critical') {
      this.reportCriticalEvent(event);
    }
  }

  /**
   * Record error
   */
  private recordError(type: string, message: string): void {
    this.metrics.errorCount++;
    
    this.recordEvent({
      id: `error_${Date.now()}`,
      type: 'error',
      timestamp: Date.now(),
      metadata: {
        type,
        message,
        stack: new Error().stack,
      },
      severity: 'high',
    });
  }

  /**
   * Record crash
   */
  recordCrash(error: Error): void {
    this.metrics.crashCount++;
    
    this.recordEvent({
      id: `crash_${Date.now()}`,
      type: 'crash',
      timestamp: Date.now(),
      metadata: {
        message: error.message,
        stack: error.stack,
        platform: Platform.OS,
        version: Platform.Version,
      },
      severity: 'critical',
    });
  }

  /**
   * Handle memory warning
   */
  private handleMemoryWarning(): void {
    this.recordEvent({
      id: `memory_warning_${Date.now()}`,
      type: 'memory_warning',
      timestamp: Date.now(),
      metadata: {
        memoryUsage: this.metrics.memoryUsage,
      },
      severity: 'high',
    });
  }

  /**
   * Handle app state change
   */
  private handleAppStateChange(nextAppState: string): void {
    if (nextAppState === 'active') {
      this.updateSystemMetrics();
    }
  }

  /**
   * Update system metrics
   */
  private async updateSystemMetrics(): Promise<void> {
    try {
      // Memory usage
      const memoryInfo = await DeviceInfo.getUsedMemory();
      this.metrics.memoryUsage = memoryInfo;
      
      // Battery level
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      this.metrics.batteryLevel = batteryLevel * 100;
      
      // Network latency
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        this.measureNetworkLatency();
      }
      
    } catch (error) {
      console.warn('Failed to update system metrics:', error);
    }
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<void> {
    try {
      const startTime = performance.now();
      await fetch('https://httpbin.org/delay/0', { method: 'HEAD' });
      const latency = performance.now() - startTime;
      this.metrics.networkLatency = latency;
    } catch (error) {
      // Network request failed, don't update latency
    }
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    this.reportingTimer = setInterval(() => {
      this.generatePerformanceReport();
    }, this.config.reportingInterval);
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<any> {
    const report = {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      events: this.events.slice(-100), // Last 100 events
      deviceInfo: await this.getDeviceInfo(),
      thresholdViolations: this.getThresholdViolations(),
      recommendations: this.generateRecommendations(),
    };
    
    // Save report locally
    await this.saveReport(report);
    
    // Send to analytics service (if configured)
    await this.sendToAnalytics(report);
    
    return report;
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<any> {
    try {
      return {
        brand: await DeviceInfo.getBrand(),
        model: await DeviceInfo.getModel(),
        systemVersion: await DeviceInfo.getSystemVersion(),
        totalMemory: await DeviceInfo.getTotalMemory(),
        freeDiskStorage: await DeviceInfo.getFreeDiskStorage(),
        batteryLevel: await DeviceInfo.getBatteryLevel(),
        isEmulator: await DeviceInfo.isEmulator(),
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Get threshold violations
   */
  private getThresholdViolations(): any[] {
    const violations = [];
    
    if (this.metrics.appStartTime > this.config.thresholds.appStartTime) {
      violations.push({
        metric: 'appStartTime',
        value: this.metrics.appStartTime,
        threshold: this.config.thresholds.appStartTime,
        severity: 'high',
      });
    }
    
    if (this.metrics.screenTransitionTime > this.config.thresholds.screenTransitionTime) {
      violations.push({
        metric: 'screenTransitionTime',
        value: this.metrics.screenTransitionTime,
        threshold: this.config.thresholds.screenTransitionTime,
        severity: 'medium',
      });
    }
    
    if (this.metrics.apiResponseTime > this.config.thresholds.apiResponseTime) {
      violations.push({
        metric: 'apiResponseTime',
        value: this.metrics.apiResponseTime,
        threshold: this.config.thresholds.apiResponseTime,
        severity: 'medium',
      });
    }
    
    if (this.metrics.memoryUsage > this.config.thresholds.memoryUsage) {
      violations.push({
        metric: 'memoryUsage',
        value: this.metrics.memoryUsage,
        threshold: this.config.thresholds.memoryUsage,
        severity: 'high',
      });
    }
    
    return violations;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations = [];
    const violations = this.getThresholdViolations();
    
    violations.forEach(violation => {
      switch (violation.metric) {
        case 'appStartTime':
          recommendations.push('Consider lazy loading components and reducing initial bundle size');
          break;
        case 'screenTransitionTime':
          recommendations.push('Optimize screen transitions with React Navigation performance tips');
          break;
        case 'apiResponseTime':
          recommendations.push('Implement request caching and optimize API endpoints');
          break;
        case 'memoryUsage':
          recommendations.push('Review memory leaks and optimize image loading');
          break;
      }
    });
    
    if (this.metrics.errorCount > 10) {
      recommendations.push('High error count detected - review error handling and logging');
    }
    
    if (this.metrics.crashCount > 0) {
      recommendations.push('Crashes detected - implement better error boundaries and crash reporting');
    }
    
    return recommendations;
  }

  /**
   * Save report locally
   */
  private async saveReport(report: any): Promise<void> {
    try {
      const reportKey = `performance_report_${Date.now()}`;
      await AsyncStorage.setItem(reportKey, JSON.stringify(report));
      
      // Keep only last 10 reports
      const allKeys = await AsyncStorage.getAllKeys();
      const reportKeys = allKeys.filter(key => key.startsWith('performance_report_'));
      
      if (reportKeys.length > 10) {
        const oldestKeys = reportKeys.sort().slice(0, reportKeys.length - 10);
        await AsyncStorage.multiRemove(oldestKeys);
      }
      
    } catch (error) {
      console.warn('Failed to save performance report:', error);
    }
  }

  /**
   * Send to analytics service
   */
  private async sendToAnalytics(report: any): Promise<void> {
    // This would integrate with your analytics service
    // For now, we'll just log it
    console.log('📊 Performance Report:', {
      timestamp: new Date(report.timestamp).toISOString(),
      violations: report.thresholdViolations.length,
      recommendations: report.recommendations.length,
    });
  }

  /**
   * Report critical event immediately
   */
  private async reportCriticalEvent(event: PerformanceEvent): Promise<void> {
    console.error('🚨 Critical Performance Event:', event);
    
    // Send immediate alert to monitoring service
    // This would integrate with your alerting system
  }

  /**
   * Check if event should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 50): PerformanceEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<PerformanceConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('performance_config', JSON.stringify(this.config));
  }

  /**
   * Cleanup and stop monitoring
   */
  cleanup(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
    
    if (this.memoryWarningListener) {
      this.memoryWarningListener.remove();
    }
    
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    
    this.isMonitoring = false;
    console.log('🛑 Performance monitoring stopped');
  }
}

export default PerformanceMonitoringService;
export { PerformanceMetrics, PerformanceEvent, PerformanceConfig };
