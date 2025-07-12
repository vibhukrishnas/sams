/**
 * React Native Performance Polyfill
 * Provides performance API compatibility for React Native
 */

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

interface PerformanceMeasure extends PerformanceEntry {
  entryType: 'measure';
}

interface PerformanceNavigation extends PerformanceEntry {
  entryType: 'navigation';
}

class ReactNativePerformance {
  private startTime: number;
  private marks: Map<string, number> = new Map();
  private measures: PerformanceMeasure[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get current timestamp
   */
  now(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Mark a performance timestamp
   */
  mark(name: string): void {
    const timestamp = this.now();
    this.marks.set(name, timestamp);
    
    // Notify observers
    this.notifyObservers({
      name,
      entryType: 'mark',
      startTime: timestamp,
      duration: 0,
    });
  }

  /**
   * Measure performance between two marks
   */
  measure(name: string, startMark?: string, endMark?: string): void {
    const endTime = endMark ? this.marks.get(endMark) || this.now() : this.now();
    const startTime = startMark ? this.marks.get(startMark) || 0 : 0;
    const duration = endTime - startTime;

    const measure: PerformanceMeasure = {
      name,
      entryType: 'measure',
      startTime,
      duration,
    };

    this.measures.push(measure);
    this.notifyObservers(measure);
  }

  /**
   * Get performance entries by type
   */
  getEntriesByType(type: string): PerformanceEntry[] {
    switch (type) {
      case 'measure':
        return [...this.measures];
      case 'mark':
        return Array.from(this.marks.entries()).map(([name, startTime]) => ({
          name,
          entryType: 'mark',
          startTime,
          duration: 0,
        }));
      default:
        return [];
    }
  }

  /**
   * Get performance entries by name
   */
  getEntriesByName(name: string): PerformanceEntry[] {
    return [
      ...this.getEntriesByType('mark'),
      ...this.getEntriesByType('measure'),
    ].filter(entry => entry.name === name);
  }

  /**
   * Get all performance entries
   */
  getEntries(): PerformanceEntry[] {
    return [
      ...this.getEntriesByType('mark'),
      ...this.getEntriesByType('measure'),
    ];
  }

  /**
   * Clear marks
   */
  clearMarks(name?: string): void {
    if (name) {
      this.marks.delete(name);
    } else {
      this.marks.clear();
    }
  }

  /**
   * Clear measures
   */
  clearMeasures(name?: string): void {
    if (name) {
      this.measures = this.measures.filter(measure => measure.name !== name);
    } else {
      this.measures = [];
    }
  }

  /**
   * Memory information (mock for React Native)
   */
  get memory(): PerformanceMemory | undefined {
    // In React Native, we can't access actual memory info
    // Return mock data for compatibility
    return {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB mock
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB mock
      jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB mock
    };
  }

  /**
   * Notify performance observers
   */
  private notifyObservers(entry: PerformanceEntry): void {
    this.observers.forEach(observer => {
      try {
        observer.callback([entry]);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }

  /**
   * Add performance observer
   */
  addObserver(observer: PerformanceObserver): void {
    this.observers.push(observer);
  }

  /**
   * Remove performance observer
   */
  removeObserver(observer: PerformanceObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }
}

/**
 * Performance Observer for React Native
 */
class PerformanceObserver {
  callback: (entries: PerformanceEntry[]) => void;
  private performance: ReactNativePerformance;

  constructor(callback: (entries: PerformanceEntry[]) => void) {
    this.callback = callback;
    this.performance = performanceInstance;
  }

  observe(options: { entryTypes: string[] }): void {
    this.performance.addObserver(this);
  }

  disconnect(): void {
    this.performance.removeObserver(this);
  }
}

// Create singleton instance
const performanceInstance = new ReactNativePerformance();

// Polyfill global performance object if not available
if (typeof global.performance === 'undefined') {
  global.performance = performanceInstance;
}

if (typeof global.PerformanceObserver === 'undefined') {
  global.PerformanceObserver = PerformanceObserver;
}

export { ReactNativePerformance, PerformanceObserver };
export const performance = performanceInstance;
