import { performance } from 'perf_hooks';
import PerformanceMonitoringService from '../../services/PerformanceMonitoringService';
import CrashReportingService from '../../services/CrashReportingService';
import BatteryOptimizationService from '../../services/BatteryOptimizationService';
import PerformanceTestUtils from '../PerformanceTestUtils';

describe('Performance Test Suite', () => {
  let performanceMonitor: PerformanceMonitoringService;
  let crashReporter: CrashReportingService;
  let batteryOptimizer: BatteryOptimizationService;
  let testUtils: PerformanceTestUtils;

  beforeAll(async () => {
    performanceMonitor = PerformanceMonitoringService.getInstance();
    crashReporter = CrashReportingService.getInstance();
    batteryOptimizer = BatteryOptimizationService.getInstance();
    testUtils = PerformanceTestUtils.getInstance();

    await performanceMonitor.initialize();
    await crashReporter.initialize();
    await batteryOptimizer.initialize();
  });

  afterAll(() => {
    performanceMonitor.cleanup();
    crashReporter.cleanup();
    batteryOptimizer.cleanup();
  });

  describe('App Startup Performance', () => {
    it('should start within performance threshold', async () => {
      const thresholds = {
        maxRenderTime: 3000, // 3 seconds
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        maxComponentCount: 50,
        maxReRenderCount: 10,
      };

      const result = await testUtils.measureComponentRender(
        'app_startup',
        () => {
          // Simulate app startup
          const startTime = performance.now();
          
          // Mock component mounting
          for (let i = 0; i < 20; i++) {
            testUtils.trackReRender('app_startup');
          }
          
          return performance.now() - startTime;
        },
        thresholds
      );

      expect(result.passed).toBe(true);
      expect(result.metrics.renderTime).toBeLessThan(thresholds.maxRenderTime);
      expect(result.violations).toHaveLength(0);
    });

    it('should initialize services efficiently', async () => {
      const startTime = performance.now();
      
      // Re-initialize services to measure startup time
      await performanceMonitor.initialize();
      await crashReporter.initialize();
      await batteryOptimizer.initialize();
      
      const initTime = performance.now() - startTime;
      
      expect(initTime).toBeLessThan(1000); // Should initialize within 1 second
    });

    it('should handle cold start efficiently', async () => {
      const benchmark = testUtils.createBenchmark('cold_start', 5);
      
      const result = await benchmark.runAsync(async () => {
        // Simulate cold start
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize critical services
        await performanceMonitor.initialize();
        
        // Load initial data
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      expect(result.renderTime).toBeLessThan(500); // Average cold start < 500ms
      expect(result.memoryUsage).toBeLessThan(50 * 1024 * 1024); // < 50MB
    });
  });

  describe('Screen Transition Performance', () => {
    it('should transition between screens smoothly', async () => {
      const screens = ['Dashboard', 'AlertList', 'AlertDetails', 'Settings'];
      const transitionTimes: number[] = [];

      for (const screen of screens) {
        const startTime = performance.now();
        
        performanceMonitor.startScreenTransition(screen);
        
        // Simulate screen rendering
        await new Promise(resolve => setTimeout(resolve, 50));
        
        performanceMonitor.endScreenTransition(screen);
        
        const transitionTime = performance.now() - startTime;
        transitionTimes.push(transitionTime);
      }

      const averageTransitionTime = transitionTimes.reduce((a, b) => a + b, 0) / transitionTimes.length;
      
      expect(averageTransitionTime).toBeLessThan(500); // < 500ms average
      expect(Math.max(...transitionTimes)).toBeLessThan(1000); // No transition > 1s
    });

    it('should handle rapid navigation without performance degradation', async () => {
      const rapidNavigationTest = async () => {
        const screens = ['Dashboard', 'AlertList', 'AlertDetails', 'Analytics', 'Settings'];
        
        for (let i = 0; i < 10; i++) {
          const screen = screens[i % screens.length];
          performanceMonitor.startScreenTransition(screen);
          await new Promise(resolve => setTimeout(resolve, 10));
          performanceMonitor.endScreenTransition(screen);
        }
      };

      const result = await testUtils.measureAsyncOperation(
        'rapid_navigation',
        rapidNavigationTest,
        {
          maxRenderTime: 2000,
          maxMemoryUsage: 75 * 1024 * 1024,
          maxComponentCount: 100,
          maxReRenderCount: 50,
        }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('API Performance', () => {
    it('should handle API calls within acceptable time', async () => {
      const apiEndpoints = [
        '/api/alerts',
        '/api/servers',
        '/api/analytics',
        '/api/settings',
      ];

      const apiTimes: number[] = [];

      for (const endpoint of apiEndpoints) {
        const callId = performanceMonitor.startApiCall(endpoint);
        
        // Simulate API call
        const startTime = performance.now();
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
        const duration = performance.now() - startTime;
        
        performanceMonitor.endApiCall(callId, endpoint, true, 200);
        apiTimes.push(duration);
      }

      const averageApiTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
      
      expect(averageApiTime).toBeLessThan(2000); // < 2s average
      expect(Math.max(...apiTimes)).toBeLessThan(5000); // No API call > 5s
    });

    it('should handle concurrent API calls efficiently', async () => {
      const concurrentCalls = 5;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < concurrentCalls; i++) {
        const promise = (async () => {
          const callId = performanceMonitor.startApiCall(`/api/test/${i}`);
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
          performanceMonitor.endApiCall(callId, `/api/test/${i}`, true, 200);
        })();
        
        promises.push(promise);
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      // Concurrent calls should complete faster than sequential
      expect(totalTime).toBeLessThan(2000); // Should complete within 2s
    });

    it('should handle API errors gracefully', async () => {
      const errorScenarios = [
        { endpoint: '/api/timeout', delay: 5000, expectTimeout: true },
        { endpoint: '/api/error', status: 500, expectError: true },
        { endpoint: '/api/notfound', status: 404, expectError: true },
      ];

      for (const scenario of errorScenarios) {
        const callId = performanceMonitor.startApiCall(scenario.endpoint);
        
        try {
          // Simulate API error
          if (scenario.expectTimeout) {
            await new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 1000)
            );
          } else {
            throw new Error(`HTTP ${scenario.status}`);
          }
        } catch (error) {
          performanceMonitor.endApiCall(callId, scenario.endpoint, false, scenario.status);
        }
      }

      // Should not crash or cause memory leaks
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.errorCount).toBeGreaterThan(0);
    });
  });

  describe('Memory Performance', () => {
    it('should maintain stable memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate memory-intensive operations
      const largeArrays: any[] = [];
      for (let i = 0; i < 100; i++) {
        largeArrays.push(new Array(1000).fill(Math.random()));
      }

      const peakMemory = process.memoryUsage().heapUsed;
      
      // Clear arrays to simulate cleanup
      largeArrays.length = 0;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB increase
    });

    it('should handle memory pressure gracefully', async () => {
      const memoryTest = async () => {
        // Simulate memory pressure
        const arrays: any[] = [];
        
        try {
          for (let i = 0; i < 1000; i++) {
            arrays.push(new Array(10000).fill(i));
            
            // Check if we should stop to prevent actual memory issues
            if (i % 100 === 0) {
              const memUsage = process.memoryUsage().heapUsed;
              if (memUsage > 200 * 1024 * 1024) { // 200MB limit
                break;
              }
            }
          }
        } finally {
          // Cleanup
          arrays.length = 0;
        }
      };

      // Should not crash or throw memory errors
      await expect(memoryTest()).resolves.not.toThrow();
    });
  });

  describe('Battery Performance', () => {
    it('should optimize battery usage based on level', async () => {
      const batteryLevels = [100, 50, 20, 10, 5];
      
      for (const level of batteryLevels) {
        // Mock battery level
        jest.spyOn(batteryOptimizer as any, 'metrics', 'get').mockReturnValue({
          level,
          isCharging: false,
          powerSaveMode: level <= 20,
        });

        // Trigger optimization evaluation
        await (batteryOptimizer as any).evaluateOptimizations();
        
        const stats = batteryOptimizer.getBatteryStatistics();
        
        if (level <= 10) {
          expect(stats.profile).toBe('ultra_saver');
          expect(stats.activeOptimizations).toBeGreaterThan(0);
        } else if (level <= 20) {
          expect(stats.profile).toBe('power_saver');
        }
      }
    });

    it('should measure battery drain rate accurately', async () => {
      const mockHistory = [
        { timestamp: Date.now() - 3600000, level: 100 }, // 1 hour ago
        { timestamp: Date.now() - 1800000, level: 95 },  // 30 min ago
        { timestamp: Date.now(), level: 90 },             // now
      ];

      // Mock battery history
      (batteryOptimizer as any).batteryHistory = mockHistory;
      
      const stats = batteryOptimizer.getBatteryStatistics();
      
      // Should calculate drain rate (10% in 1 hour = 10% per hour)
      expect(stats.history.averageDrainRate).toBeCloseTo(10, 1);
    });
  });

  describe('Crash Reporting Performance', () => {
    it('should report crashes without impacting performance', async () => {
      const crashReportingTest = async () => {
        const errors = [
          new Error('Test error 1'),
          new Error('Test error 2'),
          new Error('Test error 3'),
        ];

        for (const error of errors) {
          await crashReporter.reportError(error, 'javascript_error');
        }
      };

      const result = await testUtils.measureAsyncOperation(
        'crash_reporting',
        crashReportingTest,
        {
          maxRenderTime: 1000,
          maxMemoryUsage: 50 * 1024 * 1024,
          maxComponentCount: 10,
          maxReRenderCount: 5,
        }
      );

      expect(result.passed).toBe(true);
      
      const reports = crashReporter.getReports();
      expect(reports.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle high volume of errors efficiently', async () => {
      const highVolumeTest = async () => {
        const promises: Promise<string>[] = [];
        
        for (let i = 0; i < 50; i++) {
          const promise = crashReporter.reportError(
            new Error(`Bulk error ${i}`),
            'javascript_error'
          );
          promises.push(promise);
        }
        
        await Promise.all(promises);
      };

      const startTime = performance.now();
      await highVolumeTest();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should handle 50 errors in < 5s
      
      const stats = crashReporter.getCrashStatistics();
      expect(stats.total).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Overall Performance Integration', () => {
    it('should maintain performance under load', async () => {
      const loadTest = async () => {
        // Simulate realistic app usage
        const tasks = [
          // Screen transitions
          async () => {
            for (let i = 0; i < 5; i++) {
              performanceMonitor.startScreenTransition(`Screen${i}`);
              await new Promise(resolve => setTimeout(resolve, 50));
              performanceMonitor.endScreenTransition(`Screen${i}`);
            }
          },
          
          // API calls
          async () => {
            for (let i = 0; i < 10; i++) {
              const callId = performanceMonitor.startApiCall(`/api/load-test/${i}`);
              await new Promise(resolve => setTimeout(resolve, 100));
              performanceMonitor.endApiCall(callId, `/api/load-test/${i}`, true, 200);
            }
          },
          
          // Error reporting
          async () => {
            for (let i = 0; i < 5; i++) {
              await crashReporter.reportError(new Error(`Load test error ${i}`));
            }
          },
        ];

        await Promise.all(tasks.map(task => task()));
      };

      const result = await testUtils.measureAsyncOperation(
        'load_test',
        loadTest,
        {
          maxRenderTime: 10000,
          maxMemoryUsage: 150 * 1024 * 1024,
          maxComponentCount: 200,
          maxReRenderCount: 100,
        }
      );

      expect(result.passed).toBe(true);
    });

    it('should generate comprehensive performance report', async () => {
      const report = await performanceMonitor.generatePerformanceReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('events');
      expect(report).toHaveProperty('deviceInfo');
      expect(report).toHaveProperty('thresholdViolations');
      expect(report).toHaveProperty('recommendations');
      
      expect(Array.isArray(report.events)).toBe(true);
      expect(Array.isArray(report.thresholdViolations)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should not regress from baseline performance', async () => {
      // Define baseline performance metrics
      const baseline = {
        appStartTime: 3000,
        screenTransitionTime: 500,
        apiResponseTime: 2000,
        memoryUsage: 100 * 1024 * 1024,
      };

      const currentMetrics = performanceMonitor.getMetrics();
      
      expect(currentMetrics.appStartTime).toBeLessThanOrEqual(baseline.appStartTime);
      expect(currentMetrics.screenTransitionTime).toBeLessThanOrEqual(baseline.screenTransitionTime);
      expect(currentMetrics.apiResponseTime).toBeLessThanOrEqual(baseline.apiResponseTime);
      expect(currentMetrics.memoryUsage).toBeLessThanOrEqual(baseline.memoryUsage);
    });

    it('should maintain 60fps during animations', async () => {
      const frameTest = async () => {
        const frameTimes: number[] = [];
        const targetFPS = 60;
        const targetFrameTime = 1000 / targetFPS; // ~16.67ms

        for (let i = 0; i < 60; i++) { // Test 1 second worth of frames
          const frameStart = performance.now();
          
          // Simulate frame work
          testUtils.simulateRenderWork();
          
          const frameEnd = performance.now();
          frameTimes.push(frameEnd - frameStart);
          
          // Wait for next frame
          await new Promise(resolve => setTimeout(resolve, targetFrameTime));
        }

        const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const droppedFrames = frameTimes.filter(time => time > targetFrameTime).length;
        
        return { averageFrameTime, droppedFrames, totalFrames: frameTimes.length };
      };

      const result = await frameTest();
      
      expect(result.averageFrameTime).toBeLessThan(16.67); // 60fps
      expect(result.droppedFrames / result.totalFrames).toBeLessThan(0.1); // < 10% dropped frames
    });
  });
});
