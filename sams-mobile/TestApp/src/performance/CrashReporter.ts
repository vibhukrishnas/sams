/**
 * Crash Reporting and Error Tracking System
 * Comprehensive error monitoring and crash reporting
 */

import { Platform } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';

interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  timestamp: string;
  userId?: string;
  sessionId: string;
  appVersion: string;
  platform: string;
  deviceInfo: any;
}

interface CrashInfo {
  type: 'javascript' | 'native' | 'unhandled';
  fatal: boolean;
  error: Error;
  errorInfo?: any;
  context?: any;
  breadcrumbs: Breadcrumb[];
}

interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  data?: any;
}

interface PerformanceIssue {
  type: 'memory' | 'cpu' | 'network' | 'render' | 'startup';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metrics: any;
  timestamp: string;
}

class CrashReporter {
  private sessionId: string;
  private userId?: string;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number = 100;
  private isInitialized: boolean = false;
  private errorQueue: ErrorInfo[] = [];
  private performanceIssues: PerformanceIssue[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  /**
   * Initialize crash reporting
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize Firebase Crashlytics
      await crashlytics().setCrashlyticsCollectionEnabled(true);
      
      // Set session identifier
      await crashlytics().setUserId(this.sessionId);
      
      // Setup global error handlers
      this.setupGlobalErrorHandlers();
      
      // Setup unhandled promise rejection handler
      this.setupUnhandledRejectionHandler();
      
      // Setup React Native error handler
      this.setupReactNativeErrorHandler();
      
      this.isInitialized = true;
      console.log('📊 Crash reporting initialized');
      
      // Process queued errors
      this.processErrorQueue();
      
    } catch (error) {
      console.error('Failed to initialize crash reporting:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Global JavaScript error handler
    const originalErrorHandler = global.ErrorUtils.getGlobalHandler();
    
    global.ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      this.reportCrash({
        type: 'javascript',
        fatal: isFatal,
        error,
        breadcrumbs: [...this.breadcrumbs],
      });
      
      // Call original handler
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }

  /**
   * Setup unhandled promise rejection handler
   */
  private setupUnhandledRejectionHandler(): void {
    const tracking = require('promise/setimmediate/rejection-tracking');
    
    tracking.enable({
      allRejections: true,
      onUnhandled: (id: number, error: Error) => {
        this.reportError(error, {
          type: 'unhandled_promise_rejection',
          promiseId: id,
        });
      },
    });
  }

  /**
   * Setup React Native error handler
   */
  private setupReactNativeErrorHandler(): void {
    // Console error override
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Check if this is a React error
      if (args[0] && typeof args[0] === 'string' && args[0].includes('React')) {
        this.addBreadcrumb({
          category: 'react',
          message: args.join(' '),
          level: 'error',
          timestamp: new Date().toISOString(),
        });
      }
      
      originalConsoleError.apply(console, args);
    };
  }

  /**
   * Set user identifier
   */
  setUserId(userId: string): void {
    this.userId = userId;
    
    if (this.isInitialized) {
      crashlytics().setUserId(userId);
    }
  }

  /**
   * Set custom attributes
   */
  setCustomAttribute(key: string, value: string): void {
    if (this.isInitialized) {
      crashlytics().setAttribute(key, value);
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);
    
    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
    
    // Send to Crashlytics
    if (this.isInitialized) {
      crashlytics().log(breadcrumb.message);
    }
  }

  /**
   * Report error
   */
  reportError(error: Error, context?: any): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      appVersion: '1.0.0', // Get from app config
      platform: Platform.OS,
      deviceInfo: this.getDeviceInfo(),
    };

    if (context) {
      (errorInfo as any).context = context;
    }

    // Add breadcrumb for this error
    this.addBreadcrumb({
      category: 'error',
      message: `Error: ${error.message}`,
      level: 'error',
      timestamp: new Date().toISOString(),
      data: context,
    });

    if (this.isInitialized) {
      // Report to Crashlytics
      crashlytics().recordError(error);
      
      // Log additional context
      if (context) {
        Object.keys(context).forEach(key => {
          crashlytics().setAttribute(key, String(context[key]));
        });
      }
    } else {
      // Queue for later processing
      this.errorQueue.push(errorInfo);
    }

    console.error('📊 Error reported:', errorInfo);
  }

  /**
   * Report crash
   */
  reportCrash(crashInfo: CrashInfo): void {
    const { type, fatal, error, errorInfo, context, breadcrumbs } = crashInfo;

    // Add crash breadcrumb
    this.addBreadcrumb({
      category: 'crash',
      message: `${type} crash: ${error.message}`,
      level: 'error',
      timestamp: new Date().toISOString(),
      data: { fatal, type },
    });

    if (this.isInitialized) {
      // Set crash context
      crashlytics().setAttribute('crash_type', type);
      crashlytics().setAttribute('is_fatal', String(fatal));
      
      if (context) {
        Object.keys(context).forEach(key => {
          crashlytics().setAttribute(`crash_${key}`, String(context[key]));
        });
      }

      // Report crash
      if (fatal) {
        crashlytics().crash();
      } else {
        crashlytics().recordError(error);
      }
    }

    console.error('💥 Crash reported:', {
      type,
      fatal,
      message: error.message,
      context,
    });
  }

  /**
   * Report performance issue
   */
  reportPerformanceIssue(issue: PerformanceIssue): void {
    this.performanceIssues.push(issue);

    // Add breadcrumb
    this.addBreadcrumb({
      category: 'performance',
      message: `Performance issue: ${issue.description}`,
      level: issue.severity === 'critical' ? 'error' : 'warning',
      timestamp: new Date().toISOString(),
      data: issue.metrics,
    });

    // Report to Crashlytics as non-fatal
    if (this.isInitialized) {
      const performanceError = new Error(`Performance Issue: ${issue.description}`);
      crashlytics().setAttribute('performance_type', issue.type);
      crashlytics().setAttribute('performance_severity', issue.severity);
      crashlytics().recordError(performanceError);
    }

    console.warn('⚡ Performance issue reported:', issue);
  }

  /**
   * React Error Boundary handler
   */
  reportErrorBoundary(error: Error, errorInfo: any): void {
    this.reportError(error, {
      type: 'error_boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  /**
   * Network error handler
   */
  reportNetworkError(url: string, error: Error, requestInfo?: any): void {
    this.reportError(error, {
      type: 'network_error',
      url,
      requestInfo,
    });
  }

  /**
   * API error handler
   */
  reportAPIError(endpoint: string, statusCode: number, response?: any): void {
    const error = new Error(`API Error: ${statusCode} at ${endpoint}`);
    this.reportError(error, {
      type: 'api_error',
      endpoint,
      statusCode,
      response,
    });
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): any {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      // Add more device info as needed
    };
  }

  /**
   * Process queued errors
   */
  private processErrorQueue(): void {
    if (this.errorQueue.length > 0) {
      console.log(`📊 Processing ${this.errorQueue.length} queued errors`);
      
      this.errorQueue.forEach(errorInfo => {
        const error = new Error(errorInfo.message);
        error.stack = errorInfo.stack;
        this.reportError(error, errorInfo);
      });
      
      this.errorQueue = [];
    }
  }

  /**
   * Get crash report summary
   */
  getCrashReportSummary(): any {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      breadcrumbCount: this.breadcrumbs.length,
      performanceIssueCount: this.performanceIssues.length,
      queuedErrorCount: this.errorQueue.length,
      isInitialized: this.isInitialized,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): any {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      breadcrumbs: this.breadcrumbs,
      performanceIssues: this.performanceIssues,
      queuedErrors: this.errorQueue,
      deviceInfo: this.getDeviceInfo(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.breadcrumbs = [];
    this.performanceIssues = [];
    this.errorQueue = [];
    this.sessionId = this.generateSessionId();
    
    if (this.isInitialized) {
      crashlytics().setUserId(this.sessionId);
    }
    
    console.log('📊 Crash reporter session cleared');
  }

  /**
   * Test crash reporting
   */
  testCrash(): void {
    if (__DEV__) {
      console.log('🧪 Testing crash reporting...');
      const testError = new Error('Test crash for debugging');
      this.reportCrash({
        type: 'javascript',
        fatal: false,
        error: testError,
        breadcrumbs: [...this.breadcrumbs],
        context: { test: true },
      });
    }
  }
}

// Export singleton instance
export const crashReporter = new CrashReporter();

// React Error Boundary HOC
export const withErrorBoundary = (WrappedComponent: React.ComponentType<any>) => {
  return class ErrorBoundary extends React.Component {
    componentDidCatch(error: Error, errorInfo: any) {
      crashReporter.reportErrorBoundary(error, errorInfo);
    }

    render() {
      return React.createElement(WrappedComponent, this.props);
    }
  };
};

export default crashReporter;
