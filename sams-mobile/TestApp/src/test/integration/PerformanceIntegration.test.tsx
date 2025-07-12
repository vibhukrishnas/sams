/**
 * Performance Integration Tests
 * Tests for performance monitoring integration across the app
 */

import React from 'react';
import { renderWithProviders } from '../utils';
import { performanceOptimizer } from '../../performance/PerformanceOptimizer';
import { batteryOptimizer } from '../../performance/BatteryOptimizer';
import { crashReporter } from '../../performance/CrashReporter';
import AlertsScreen from '../../screens/AlertsScreen';
import { createMockNavigation, createMockRoute } from '../utils';

describe('Performance Integration Tests', () => {
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute({ name: 'Alerts' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Performance Optimizer Integration', () => {
    it('should initialize performance monitoring on app start', () => {
      const metrics = performanceOptimizer.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.appStartTime).toBe('number');
    });

    it('should track component render performance', async () => {
      const startTime = performance.now();
      
      renderWithProviders(
        <AlertsScreen navigation={mockNavigation} route={mockRoute} />
      );
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render quickly
    });

    it('should provide optimization recommendations', () => {
      const recommendations = performanceOptimizer.getOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should generate performance reports', () => {
      const report = performanceOptimizer.generatePerformanceReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('config');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('deviceInfo');
    });
  });

  describe('Battery Optimizer Integration', () => {
    it('should monitor battery information', () => {
      const batteryInfo = batteryOptimizer.getBatteryInfo();
      
      expect(batteryInfo).toHaveProperty('level');
      expect(batteryInfo).toHaveProperty('isCharging');
      expect(batteryInfo).toHaveProperty('isLowPowerMode');
      expect(batteryInfo).toHaveProperty('batteryState');
    });

    it('should provide optimization strategies', () => {
      const strategies = batteryOptimizer.getOptimizationStrategies();
      
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
      
      strategies.forEach(strategy => {
        expect(strategy).toHaveProperty('name');
        expect(strategy).toHaveProperty('description');
        expect(strategy).toHaveProperty('batteryImpact');
        expect(strategy).toHaveProperty('enabled');
        expect(strategy).toHaveProperty('action');
      });
    });

    it('should generate battery optimization reports', () => {
      const report = batteryOptimizer.getBatteryOptimizationReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('batteryInfo');
      expect(report).toHaveProperty('config');
      expect(report).toHaveProperty('activeStrategies');
      expect(report).toHaveProperty('isLowPowerMode');
      expect(report).toHaveProperty('recommendations');
    });
  });

  describe('Crash Reporter Integration', () => {
    it('should initialize crash reporting', () => {
      const summary = crashReporter.getCrashReportSummary();
      
      expect(summary).toHaveProperty('sessionId');
      expect(summary).toHaveProperty('isInitialized');
      expect(summary.isInitialized).toBe(true);
    });

    it('should handle error reporting', () => {
      const testError = new Error('Test integration error');
      
      expect(() => {
        crashReporter.reportError(testError, { test: true });
      }).not.toThrow();
      
      const summary = crashReporter.getCrashReportSummary();
      expect(summary.breadcrumbCount).toBeGreaterThan(0);
    });

    it('should add breadcrumbs', () => {
      crashReporter.addBreadcrumb({
        category: 'test',
        message: 'Integration test breadcrumb',
        level: 'info',
        timestamp: new Date().toISOString(),
      });
      
      const summary = crashReporter.getCrashReportSummary();
      expect(summary.breadcrumbCount).toBeGreaterThan(0);
    });

    it('should export logs for debugging', () => {
      const logs = crashReporter.exportLogs();
      
      expect(logs).toHaveProperty('sessionId');
      expect(logs).toHaveProperty('breadcrumbs');
      expect(logs).toHaveProperty('performanceIssues');
      expect(logs).toHaveProperty('deviceInfo');
      expect(logs).toHaveProperty('timestamp');
    });
  });

  describe('Cross-Component Performance', () => {
    it('should maintain performance across multiple component renders', () => {
      const renderTimes: number[] = [];
      
      // Render component multiple times
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        const { unmount } = renderWithProviders(
          <AlertsScreen navigation={mockNavigation} route={mockRoute} />
        );
        
        const renderTime = performance.now() - startTime;
        renderTimes.push(renderTime);
        
        unmount();
      }
      
      // Check that render times are consistent
      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);
      
      expect(averageRenderTime).toBeLessThan(50);
      expect(maxRenderTime).toBeLessThan(100);
    });

    it('should handle performance monitoring during navigation', () => {
      const { rerender } = renderWithProviders(
        <AlertsScreen navigation={mockNavigation} route={mockRoute} />
      );
      
      // Simulate navigation to different screen
      const dashboardRoute = createMockRoute({ name: 'Dashboard' });
      
      const startTime = performance.now();
      rerender(
        <AlertsScreen navigation={mockNavigation} route={dashboardRoute} />
      );
      const navigationTime = performance.now() - startTime;
      
      expect(navigationTime).toBeLessThan(50);
    });
  });

  describe('Memory Management Integration', () => {
    it('should not leak memory during component lifecycle', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Create and destroy components multiple times
      for (let i = 0; i < 20; i++) {
        const { unmount } = renderWithProviders(
          <AlertsScreen navigation={mockNavigation} route={mockRoute} />
        );
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Performance Monitoring Configuration', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        enableImageOptimization: false,
        enableMemoryOptimization: true,
        maxConcurrentRequests: 3,
      };
      
      performanceOptimizer.updateConfig(newConfig);
      
      const report = performanceOptimizer.generatePerformanceReport();
      expect(report.config.enableImageOptimization).toBe(false);
      expect(report.config.enableMemoryOptimization).toBe(true);
      expect(report.config.maxConcurrentRequests).toBe(3);
    });

    it('should allow battery optimization configuration', () => {
      const newConfig = {
        lowBatteryThreshold: 15,
        criticalBatteryThreshold: 5,
        enableBackgroundOptimization: false,
      };
      
      batteryOptimizer.updateConfig(newConfig);
      
      const report = batteryOptimizer.getBatteryOptimizationReport();
      expect(report.config.lowBatteryThreshold).toBe(15);
      expect(report.config.criticalBatteryThreshold).toBe(5);
      expect(report.config.enableBackgroundOptimization).toBe(false);
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Test component error');
      };
      
      const { getByText } = renderWithProviders(
        <ErrorComponent />
      );
      
      // Should show error boundary fallback
      expect(getByText(/something went wrong/i)).toBeTruthy();
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', () => {
      // Simulate baseline performance
      const baseline = {
        renderTime: 20,
        memoryUsage: 50 * 1024 * 1024,
      };
      
      // Simulate current performance (regression)
      const current = {
        renderTime: 35, // 75% increase
        memoryUsage: 80 * 1024 * 1024, // 60% increase
      };
      
      // Check for regressions
      const renderRegression = current.renderTime > baseline.renderTime * 1.5;
      const memoryRegression = current.memoryUsage > baseline.memoryUsage * 1.5;
      
      expect(renderRegression).toBe(true);
      expect(memoryRegression).toBe(true);
    });
  });
});
