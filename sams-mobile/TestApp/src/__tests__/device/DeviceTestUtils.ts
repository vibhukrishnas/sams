import { Platform, Dimensions, PixelRatio } from 'react-native';
import DeviceInfo from 'react-native-device-info';

interface DeviceSpecs {
  platform: string;
  version: string;
  model: string;
  brand: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  fontScale: number;
  isTablet: boolean;
  hasNotch: boolean;
  isEmulator: boolean;
  totalMemory: number;
  usedMemory: number;
  batteryLevel: number;
  isLowPowerMode: boolean;
  networkType: string;
  carrier: string;
}

interface DeviceTestResult {
  device: DeviceSpecs;
  testResults: {
    renderPerformance: number;
    memoryUsage: number;
    batteryImpact: number;
    networkLatency: number;
    storageUsage: number;
  };
  compatibility: {
    supported: boolean;
    issues: string[];
    recommendations: string[];
  };
}

interface DeviceTestConfig {
  testDuration: number;
  memoryThreshold: number;
  batteryThreshold: number;
  performanceThreshold: number;
  networkTimeout: number;
}

class DeviceTestUtils {
  private static instance: DeviceTestUtils;
  private testConfig: DeviceTestConfig = {
    testDuration: 60000, // 1 minute
    memoryThreshold: 100 * 1024 * 1024, // 100MB
    batteryThreshold: 5, // 5% battery drain
    performanceThreshold: 16, // 16ms for 60fps
    networkTimeout: 5000, // 5 seconds
  };

  static getInstance(): DeviceTestUtils {
    if (!DeviceTestUtils.instance) {
      DeviceTestUtils.instance = new DeviceTestUtils();
    }
    return DeviceTestUtils.instance;
  }

  /**
   * Get comprehensive device specifications
   */
  async getDeviceSpecs(): Promise<DeviceSpecs> {
    const { width, height } = Dimensions.get('window');
    
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: await DeviceInfo.getModel(),
      brand: await DeviceInfo.getBrand(),
      screenWidth: width,
      screenHeight: height,
      pixelRatio: PixelRatio.get(),
      fontScale: PixelRatio.getFontScale(),
      isTablet: await DeviceInfo.isTablet(),
      hasNotch: await DeviceInfo.hasNotch(),
      isEmulator: await DeviceInfo.isEmulator(),
      totalMemory: await DeviceInfo.getTotalMemory(),
      usedMemory: await DeviceInfo.getUsedMemory(),
      batteryLevel: await DeviceInfo.getBatteryLevel(),
      isLowPowerMode: await DeviceInfo.isPowerSaveMode(),
      networkType: await DeviceInfo.getNetworkType(),
      carrier: await DeviceInfo.getCarrier(),
    };
  }

  /**
   * Run comprehensive device tests
   */
  async runDeviceTests(config?: Partial<DeviceTestConfig>): Promise<DeviceTestResult> {
    const finalConfig = { ...this.testConfig, ...config };
    const deviceSpecs = await this.getDeviceSpecs();
    
    console.log('🔧 Starting device tests...', deviceSpecs.model);
    
    const testResults = await Promise.all([
      this.testRenderPerformance(finalConfig.testDuration),
      this.testMemoryUsage(finalConfig.testDuration),
      this.testBatteryImpact(finalConfig.testDuration),
      this.testNetworkLatency(finalConfig.networkTimeout),
      this.testStorageUsage(),
    ]);

    const [renderPerformance, memoryUsage, batteryImpact, networkLatency, storageUsage] = testResults;
    
    const compatibility = this.evaluateCompatibility(deviceSpecs, {
      renderPerformance,
      memoryUsage,
      batteryImpact,
      networkLatency,
      storageUsage,
    }, finalConfig);

    return {
      device: deviceSpecs,
      testResults: {
        renderPerformance,
        memoryUsage,
        batteryImpact,
        networkLatency,
        storageUsage,
      },
      compatibility,
    };
  }

  /**
   * Test render performance across different screen sizes
   */
  async testRenderPerformance(duration: number): Promise<number> {
    console.log('📱 Testing render performance...');
    
    const frameTimes: number[] = [];
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const measureFrame = () => {
        const frameStart = performance.now();
        
        // Simulate heavy rendering work
        this.simulateRenderWork();
        
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        frameTimes.push(frameTime);
        
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          console.log(`✅ Render performance: ${avgFrameTime.toFixed(2)}ms avg frame time`);
          resolve(avgFrameTime);
        }
      };
      
      requestAnimationFrame(measureFrame);
    });
  }

  /**
   * Test memory usage patterns
   */
  async testMemoryUsage(duration: number): Promise<number> {
    console.log('💾 Testing memory usage...');
    
    const initialMemory = await DeviceInfo.getUsedMemory();
    const memoryReadings: number[] = [];
    
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        const currentMemory = await DeviceInfo.getUsedMemory();
        memoryReadings.push(currentMemory - initialMemory);
        
        // Simulate memory-intensive operations
        this.simulateMemoryWork();
      }, 1000);
      
      setTimeout(async () => {
        clearInterval(interval);
        const finalMemory = await DeviceInfo.getUsedMemory();
        const memoryDelta = finalMemory - initialMemory;
        
        console.log(`✅ Memory usage: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB increase`);
        resolve(memoryDelta);
      }, duration);
    });
  }

  /**
   * Test battery impact
   */
  async testBatteryImpact(duration: number): Promise<number> {
    console.log('🔋 Testing battery impact...');
    
    const initialBattery = await DeviceInfo.getBatteryLevel();
    
    return new Promise((resolve) => {
      // Simulate CPU-intensive work
      const interval = setInterval(() => {
        this.simulateCPUWork();
      }, 100);
      
      setTimeout(async () => {
        clearInterval(interval);
        const finalBattery = await DeviceInfo.getBatteryLevel();
        const batteryDelta = initialBattery - finalBattery;
        
        console.log(`✅ Battery impact: ${(batteryDelta * 100).toFixed(2)}% drain`);
        resolve(batteryDelta * 100);
      }, duration);
    });
  }

  /**
   * Test network latency
   */
  async testNetworkLatency(timeout: number): Promise<number> {
    console.log('🌐 Testing network latency...');
    
    const testUrls = [
      'https://httpbin.org/delay/0',
      'https://jsonplaceholder.typicode.com/posts/1',
      'https://api.github.com/zen',
    ];
    
    const latencies: number[] = [];
    
    for (const url of testUrls) {
      try {
        const startTime = performance.now();
        const response = await fetch(url, {
          method: 'GET',
          timeout: timeout,
        });
        const endTime = performance.now();
        
        if (response.ok) {
          latencies.push(endTime - startTime);
        }
      } catch (error) {
        console.warn(`Network test failed for ${url}:`, error);
        latencies.push(timeout); // Use timeout as penalty
      }
    }
    
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : timeout;
    
    console.log(`✅ Network latency: ${avgLatency.toFixed(2)}ms average`);
    return avgLatency;
  }

  /**
   * Test storage usage
   */
  async testStorageUsage(): Promise<number> {
    console.log('💿 Testing storage usage...');
    
    try {
      const freeStorage = await DeviceInfo.getFreeDiskStorage();
      const totalStorage = await DeviceInfo.getTotalDiskCapacity();
      const usedStorage = totalStorage - freeStorage;
      const usagePercentage = (usedStorage / totalStorage) * 100;
      
      console.log(`✅ Storage usage: ${usagePercentage.toFixed(1)}% used`);
      return usagePercentage;
    } catch (error) {
      console.warn('Storage test failed:', error);
      return 0;
    }
  }

  /**
   * Test across multiple device orientations
   */
  async testOrientations(): Promise<{ portrait: DeviceTestResult; landscape: DeviceTestResult }> {
    console.log('🔄 Testing device orientations...');
    
    // Test in portrait mode
    const portraitResults = await this.runDeviceTests();
    
    // Simulate landscape mode (would require actual device rotation in real tests)
    const landscapeResults = await this.runDeviceTests();
    
    return {
      portrait: portraitResults,
      landscape: landscapeResults,
    };
  }

  /**
   * Test different network conditions
   */
  async testNetworkConditions(): Promise<{
    wifi: number;
    cellular: number;
    offline: number;
  }> {
    console.log('📶 Testing network conditions...');
    
    // These would require actual network condition simulation
    const wifiLatency = await this.testNetworkLatency(5000);
    const cellularLatency = await this.testNetworkLatency(10000);
    const offlineLatency = 0; // Offline mode
    
    return {
      wifi: wifiLatency,
      cellular: cellularLatency,
      offline: offlineLatency,
    };
  }

  /**
   * Evaluate device compatibility
   */
  private evaluateCompatibility(
    device: DeviceSpecs,
    testResults: any,
    config: DeviceTestConfig
  ): { supported: boolean; issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check minimum requirements
    if (device.totalMemory < 2 * 1024 * 1024 * 1024) { // 2GB
      issues.push('Insufficient RAM (minimum 2GB required)');
      recommendations.push('Consider upgrading device or reducing app features');
    }
    
    if (testResults.renderPerformance > config.performanceThreshold) {
      issues.push('Poor render performance detected');
      recommendations.push('Enable performance optimizations or reduce animations');
    }
    
    if (testResults.memoryUsage > config.memoryThreshold) {
      issues.push('High memory usage detected');
      recommendations.push('Implement memory optimization strategies');
    }
    
    if (testResults.batteryImpact > config.batteryThreshold) {
      issues.push('High battery consumption detected');
      recommendations.push('Optimize background processes and reduce CPU usage');
    }
    
    if (testResults.networkLatency > config.networkTimeout) {
      issues.push('Poor network performance detected');
      recommendations.push('Implement offline mode and request caching');
    }
    
    // Platform-specific checks
    if (device.platform === 'ios' && parseFloat(device.version) < 12.0) {
      issues.push('iOS version too old (minimum iOS 12 required)');
      recommendations.push('Update iOS or use legacy app version');
    }
    
    if (device.platform === 'android' && parseFloat(device.version) < 21) {
      issues.push('Android API level too old (minimum API 21 required)');
      recommendations.push('Update Android or use legacy app version');
    }
    
    // Screen size checks
    if (device.screenWidth < 320 || device.screenHeight < 480) {
      issues.push('Screen size too small for optimal experience');
      recommendations.push('Use tablet mode or simplified UI');
    }
    
    const supported = issues.length === 0;
    
    return { supported, issues, recommendations };
  }

  /**
   * Simulate render work for testing
   */
  private simulateRenderWork(): void {
    // Simulate DOM manipulation or heavy calculations
    const iterations = 1000;
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.random() * Math.sin(i) * Math.cos(i);
    }
  }

  /**
   * Simulate memory-intensive work
   */
  private simulateMemoryWork(): void {
    // Create temporary arrays to simulate memory allocation
    const tempArrays = [];
    for (let i = 0; i < 100; i++) {
      tempArrays.push(new Array(1000).fill(Math.random()));
    }
    // Arrays will be garbage collected
  }

  /**
   * Simulate CPU-intensive work
   */
  private simulateCPUWork(): void {
    // Perform CPU-intensive calculations
    const iterations = 10000;
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.log(i + 1);
    }
  }

  /**
   * Generate device test report
   */
  generateReport(results: DeviceTestResult[]): string {
    let report = 'Device Test Report\n';
    report += '==================\n\n';
    
    results.forEach((result, index) => {
      const device = result.device;
      const tests = result.testResults;
      const compat = result.compatibility;
      
      report += `Device ${index + 1}: ${device.brand} ${device.model}\n`;
      report += `Platform: ${device.platform} ${device.version}\n`;
      report += `Screen: ${device.screenWidth}x${device.screenHeight} (${device.pixelRatio}x)\n`;
      report += `Memory: ${(device.totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB total\n`;
      report += `Compatibility: ${compat.supported ? 'SUPPORTED' : 'NOT SUPPORTED'}\n\n`;
      
      report += 'Test Results:\n';
      report += `  Render Performance: ${tests.renderPerformance.toFixed(2)}ms\n`;
      report += `  Memory Usage: ${(tests.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
      report += `  Battery Impact: ${tests.batteryImpact.toFixed(2)}%\n`;
      report += `  Network Latency: ${tests.networkLatency.toFixed(2)}ms\n`;
      report += `  Storage Usage: ${tests.storageUsage.toFixed(1)}%\n\n`;
      
      if (compat.issues.length > 0) {
        report += 'Issues:\n';
        compat.issues.forEach(issue => {
          report += `  - ${issue}\n`;
        });
        report += '\n';
      }
      
      if (compat.recommendations.length > 0) {
        report += 'Recommendations:\n';
        compat.recommendations.forEach(rec => {
          report += `  - ${rec}\n`;
        });
        report += '\n';
      }
      
      report += '---\n\n';
    });
    
    return report;
  }
}

export default DeviceTestUtils;
export { DeviceSpecs, DeviceTestResult, DeviceTestConfig };
