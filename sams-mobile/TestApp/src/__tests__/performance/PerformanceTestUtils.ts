import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
  reRenderCount: number;
  bundleSize?: number;
}

interface PerformanceThresholds {
  maxRenderTime: number;
  maxMemoryUsage: number;
  maxComponentCount: number;
  maxReRenderCount: number;
  maxBundleSize?: number;
}

interface PerformanceTestResult {
  passed: boolean;
  metrics: PerformanceMetrics;
  thresholds: PerformanceThresholds;
  violations: string[];
}

class PerformanceTestUtils {
  private static instance: PerformanceTestUtils;
  private performanceEntries: Map<string, number> = new Map();
  private renderCounts: Map<string, number> = new Map();
  private memoryBaseline: number = 0;

  static getInstance(): PerformanceTestUtils {
    if (!PerformanceTestUtils.instance) {
      PerformanceTestUtils.instance = new PerformanceTestUtils();
    }
    return PerformanceTestUtils.instance;
  }

  /**
   * Start performance measurement
   */
  startMeasurement(testName: string): void {
    this.performanceEntries.set(`${testName}_start`, performance.now());
    this.memoryBaseline = this.getCurrentMemoryUsage();
    
    // Mark performance start
    if (typeof performance.mark === 'function') {
      performance.mark(`${testName}_start`);
    }
  }

  /**
   * End performance measurement
   */
  endMeasurement(testName: string): PerformanceMetrics {
    const startTime = this.performanceEntries.get(`${testName}_start`) || 0;
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Mark performance end
    if (typeof performance.mark === 'function') {
      performance.mark(`${testName}_end`);
      performance.measure(testName, `${testName}_start`, `${testName}_end`);
    }

    const metrics: PerformanceMetrics = {
      renderTime,
      memoryUsage: this.getCurrentMemoryUsage() - this.memoryBaseline,
      componentCount: this.getComponentCount(),
      reRenderCount: this.renderCounts.get(testName) || 0,
    };

    // Clean up
    this.performanceEntries.delete(`${testName}_start`);
    this.renderCounts.delete(testName);

    return metrics;
  }

  /**
   * Measure component render performance
   */
  async measureComponentRender<T>(
    testName: string,
    renderFunction: () => T,
    thresholds: PerformanceThresholds
  ): Promise<PerformanceTestResult> {
    this.startMeasurement(testName);
    
    const result = renderFunction();
    
    // Wait for render to complete
    await this.waitForRender();
    
    const metrics = this.endMeasurement(testName);
    
    return this.evaluatePerformance(metrics, thresholds);
  }

  /**
   * Measure async operation performance
   */
  async measureAsyncOperation<T>(
    testName: string,
    operation: () => Promise<T>,
    thresholds: PerformanceThresholds
  ): Promise<PerformanceTestResult> {
    this.startMeasurement(testName);
    
    await operation();
    
    const metrics = this.endMeasurement(testName);
    
    return this.evaluatePerformance(metrics, thresholds);
  }

  /**
   * Measure memory usage during operation
   */
  async measureMemoryUsage<T>(
    testName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; memoryDelta: number }> {
    const initialMemory = this.getCurrentMemoryUsage();
    
    const result = await operation();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = this.getCurrentMemoryUsage();
    const memoryDelta = finalMemory - initialMemory;
    
    return { result, memoryDelta };
  }

  /**
   * Measure scroll performance
   */
  measureScrollPerformance(
    scrollElement: any,
    scrollDistance: number,
    duration: number
  ): Promise<PerformanceMetrics> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let frameCount = 0;
      let lastFrameTime = startTime;
      const frameTimes: number[] = [];

      const measureFrame = () => {
        const currentTime = performance.now();
        const frameTime = currentTime - lastFrameTime;
        frameTimes.push(frameTime);
        frameCount++;
        lastFrameTime = currentTime;

        if (currentTime - startTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const fps = 1000 / avgFrameTime;
          
          resolve({
            renderTime: currentTime - startTime,
            memoryUsage: this.getCurrentMemoryUsage(),
            componentCount: frameCount,
            reRenderCount: Math.round(fps),
          });
        }
      };

      // Start scroll animation
      this.simulateScroll(scrollElement, scrollDistance, duration);
      requestAnimationFrame(measureFrame);
    });
  }

  /**
   * Measure bundle size impact
   */
  async measureBundleSize(bundlePath: string): Promise<number> {
    try {
      const fs = require('fs');
      const stats = fs.statSync(bundlePath);
      return stats.size;
    } catch (error) {
      console.warn('Could not measure bundle size:', error);
      return 0;
    }
  }

  /**
   * Create performance benchmark
   */
  createBenchmark(
    name: string,
    iterations: number = 100
  ): {
    run: (operation: () => void) => Promise<PerformanceMetrics>;
    runAsync: (operation: () => Promise<void>) => Promise<PerformanceMetrics>;
  } {
    return {
      run: async (operation: () => void) => {
        const times: number[] = [];
        let totalMemory = 0;

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          const startMemory = this.getCurrentMemoryUsage();
          
          operation();
          
          const endTime = performance.now();
          const endMemory = this.getCurrentMemoryUsage();
          
          times.push(endTime - startTime);
          totalMemory += endMemory - startMemory;
        }

        return {
          renderTime: times.reduce((a, b) => a + b, 0) / times.length,
          memoryUsage: totalMemory / iterations,
          componentCount: iterations,
          reRenderCount: 0,
        };
      },

      runAsync: async (operation: () => Promise<void>) => {
        const times: number[] = [];
        let totalMemory = 0;

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          const startMemory = this.getCurrentMemoryUsage();
          
          await operation();
          
          const endTime = performance.now();
          const endMemory = this.getCurrentMemoryUsage();
          
          times.push(endTime - startTime);
          totalMemory += endMemory - startMemory;
        }

        return {
          renderTime: times.reduce((a, b) => a + b, 0) / times.length,
          memoryUsage: totalMemory / iterations,
          componentCount: iterations,
          reRenderCount: 0,
        };
      },
    };
  }

  /**
   * Track component re-renders
   */
  trackReRender(testName: string): void {
    const currentCount = this.renderCounts.get(testName) || 0;
    this.renderCounts.set(testName, currentCount + 1);
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    
    // Fallback for browser environment
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    
    return 0;
  }

  /**
   * Get component count (mock implementation)
   */
  private getComponentCount(): number {
    // In a real implementation, this would count React components
    // For testing purposes, we'll return a mock value
    return Math.floor(Math.random() * 100) + 10;
  }

  /**
   * Wait for render to complete
   */
  private waitForRender(): Promise<void> {
    return new Promise((resolve) => {
      // Use setTimeout to wait for next tick
      setTimeout(() => {
        // Use requestAnimationFrame to wait for next frame
        requestAnimationFrame(() => {
          resolve();
        });
      }, 0);
    });
  }

  /**
   * Simulate scroll for performance testing
   */
  private simulateScroll(element: any, distance: number, duration: number): void {
    const startTime = performance.now();
    const startPosition = 0;

    const animate = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentPosition = startPosition + (distance * progress);
      
      // Simulate scroll event
      if (element && element.scrollTo) {
        element.scrollTo(0, currentPosition);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Evaluate performance against thresholds
   */
  private evaluatePerformance(
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds
  ): PerformanceTestResult {
    const violations: string[] = [];

    if (metrics.renderTime > thresholds.maxRenderTime) {
      violations.push(
        `Render time ${metrics.renderTime.toFixed(2)}ms exceeds threshold ${thresholds.maxRenderTime}ms`
      );
    }

    if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
      violations.push(
        `Memory usage ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`
      );
    }

    if (metrics.componentCount > thresholds.maxComponentCount) {
      violations.push(
        `Component count ${metrics.componentCount} exceeds threshold ${thresholds.maxComponentCount}`
      );
    }

    if (metrics.reRenderCount > thresholds.maxReRenderCount) {
      violations.push(
        `Re-render count ${metrics.reRenderCount} exceeds threshold ${thresholds.maxReRenderCount}`
      );
    }

    if (thresholds.maxBundleSize && metrics.bundleSize && metrics.bundleSize > thresholds.maxBundleSize) {
      violations.push(
        `Bundle size ${(metrics.bundleSize / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(thresholds.maxBundleSize / 1024 / 1024).toFixed(2)}MB`
      );
    }

    return {
      passed: violations.length === 0,
      metrics,
      thresholds,
      violations,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(results: PerformanceTestResult[]): string {
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    let report = `Performance Test Report\n`;
    report += `========================\n\n`;
    report += `Tests Passed: ${passedTests}/${totalTests}\n`;
    report += `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;

    results.forEach((result, index) => {
      report += `Test ${index + 1}: ${result.passed ? 'PASS' : 'FAIL'}\n`;
      report += `  Render Time: ${result.metrics.renderTime.toFixed(2)}ms (threshold: ${result.thresholds.maxRenderTime}ms)\n`;
      report += `  Memory Usage: ${(result.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB (threshold: ${(result.thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB)\n`;
      report += `  Component Count: ${result.metrics.componentCount} (threshold: ${result.thresholds.maxComponentCount})\n`;
      report += `  Re-render Count: ${result.metrics.reRenderCount} (threshold: ${result.thresholds.maxReRenderCount})\n`;
      
      if (result.violations.length > 0) {
        report += `  Violations:\n`;
        result.violations.forEach(violation => {
          report += `    - ${violation}\n`;
        });
      }
      report += `\n`;
    });

    return report;
  }
}

export default PerformanceTestUtils;
export { PerformanceMetrics, PerformanceThresholds, PerformanceTestResult };
