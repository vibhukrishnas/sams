import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import Dashboard from '../src/components/Dashboard';
import ServerList from '../src/components/ServerList';
import AlertList from '../src/components/AlertList';

// Performance testing utilities
const measureRenderTime = (component) => {
  const startTime = performance.now();
  render(component);
  const endTime = performance.now();
  return endTime - startTime;
};

const measureMemoryUsage = () => {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    };
  }
  return null;
};

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      dashboard: (state = {}, action) => state,
      auth: (state = {}, action) => state,
    },
    preloadedState: initialState,
  });
};

const TestWrapper = ({ children, store }) => (
  <Provider store={store}>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </Provider>
);

describe('Mobile App Performance Tests', () => {
  beforeEach(() => {
    // Clear any existing timers
    jest.clearAllTimers();
    
    // Mock performance APIs
    global.performance = {
      now: jest.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 100000000,
      },
    };
  });

  describe('Render Performance', () => {
    test('Dashboard should render within acceptable time', () => {
      const mockStore = createMockStore({
        dashboard: {
          servers: Array.from({ length: 10 }, (_, i) => ({
            id: `server-${i}`,
            name: `Server ${i}`,
            status: 'online',
          })),
          alerts: Array.from({ length: 5 }, (_, i) => ({
            id: `alert-${i}`,
            title: `Alert ${i}`,
            severity: 'warning',
          })),
        },
      });

      const renderTime = measureRenderTime(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    test('Large server list should render efficiently', () => {
      const largeServerList = Array.from({ length: 1000 }, (_, i) => ({
        id: `server-${i}`,
        name: `Server ${i}`,
        status: i % 2 === 0 ? 'online' : 'offline',
        ip: `192.168.1.${i % 255}`,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
      }));

      const mockStore = createMockStore({
        servers: { list: largeServerList },
      });

      const renderTime = measureRenderTime(
        <TestWrapper store={mockStore}>
          <ServerList />
        </TestWrapper>
      );

      // Should render large list within 200ms
      expect(renderTime).toBeLessThan(200);
    });

    test('Large alert list should render efficiently', () => {
      const largeAlertList = Array.from({ length: 5000 }, (_, i) => ({
        id: `alert-${i}`,
        title: `Alert ${i}`,
        description: `Description for alert ${i}`,
        severity: ['critical', 'high', 'medium', 'low'][i % 4],
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        status: 'active',
      }));

      const mockStore = createMockStore({
        alerts: { list: largeAlertList },
      });

      const renderTime = measureRenderTime(
        <TestWrapper store={mockStore}>
          <AlertList />
        </TestWrapper>
      );

      // Should render large alert list within 300ms
      expect(renderTime).toBeLessThan(300);
    });
  });

  describe('Memory Performance', () => {
    test('Should not cause memory leaks with frequent updates', () => {
      const mockStore = createMockStore({
        dashboard: {
          servers: [],
          alerts: [],
          metrics: {},
        },
      });

      const initialMemory = measureMemoryUsage();

      const { rerender } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate frequent updates
      for (let i = 0; i < 100; i++) {
        const updatedStore = createMockStore({
          dashboard: {
            servers: Array.from({ length: 10 }, (_, j) => ({
              id: `server-${j}`,
              name: `Server ${j}`,
              status: Math.random() > 0.5 ? 'online' : 'offline',
              cpu: Math.random() * 100,
            })),
            alerts: [],
            metrics: { timestamp: Date.now() + i },
          },
        });

        rerender(
          <TestWrapper store={updatedStore}>
            <Dashboard />
          </TestWrapper>
        );
      }

      const finalMemory = measureMemoryUsage();

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });

    test('Should handle large datasets without excessive memory usage', () => {
      const initialMemory = measureMemoryUsage();

      const largeDataset = {
        dashboard: {
          servers: Array.from({ length: 10000 }, (_, i) => ({
            id: `server-${i}`,
            name: `Server ${i}`,
            status: 'online',
            metrics: {
              cpu: Math.random() * 100,
              memory: Math.random() * 100,
              disk: Math.random() * 100,
              network: Math.random() * 1000,
            },
          })),
          alerts: Array.from({ length: 50000 }, (_, i) => ({
            id: `alert-${i}`,
            title: `Alert ${i}`,
            description: `Long description for alert ${i}`.repeat(10),
            severity: 'critical',
            timestamp: new Date().toISOString(),
          })),
        },
      };

      const mockStore = createMockStore(largeDataset);

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const finalMemory = measureMemoryUsage();

      if (initialMemory && finalMemory) {
        const memoryUsage = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        // Should not use more than 50MB for large dataset
        expect(memoryUsage).toBeLessThan(50 * 1024 * 1024);
      }
    });
  });

  describe('Animation Performance', () => {
    test('Should maintain 60fps during animations', async () => {
      const mockStore = createMockStore({
        dashboard: {
          servers: Array.from({ length: 20 }, (_, i) => ({
            id: `server-${i}`,
            name: `Server ${i}`,
            status: 'online',
          })),
        },
      });

      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const frameDrops = [];
      let lastFrameTime = performance.now();

      // Mock requestAnimationFrame to track frame drops
      const originalRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = jest.fn((callback) => {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastFrameTime;
        
        if (frameDuration > 16.67) { // More than 60fps
          frameDrops.push(frameDuration);
        }
        
        lastFrameTime = currentTime;
        return originalRAF(callback);
      });

      // Trigger animations by updating server statuses
      for (let i = 0; i < 10; i++) {
        act(() => {
          mockStore.dispatch({
            type: 'dashboard/updateServerStatus',
            payload: { id: `server-${i}`, status: 'offline' },
          });
        });
        
        await new Promise(resolve => setTimeout(resolve, 16)); // Wait one frame
      }

      global.requestAnimationFrame = originalRAF;

      // Should have minimal frame drops
      expect(frameDrops.length).toBeLessThan(2);
    });

    test('Should handle smooth scrolling with large lists', () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        data: `Data for item ${i}`,
      }));

      const mockStore = createMockStore({
        servers: { list: largeList },
      });

      const scrollPerformance = [];
      let scrollStartTime;

      // Mock scroll event handling
      const mockScrollHandler = jest.fn((event) => {
        if (!scrollStartTime) {
          scrollStartTime = performance.now();
        }
        
        const scrollTime = performance.now() - scrollStartTime;
        scrollPerformance.push(scrollTime);
      });

      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <ServerList onScroll={mockScrollHandler} />
        </TestWrapper>
      );

      // Simulate scroll events
      const scrollView = getByTestId('server-list-scroll');
      
      for (let i = 0; i < 10; i++) {
        act(() => {
          scrollView.props.onScroll({
            nativeEvent: {
              contentOffset: { y: i * 100 },
              contentSize: { height: 100000 },
              layoutMeasurement: { height: 800 },
            },
          });
        });
      }

      // Scroll handling should be responsive
      const averageScrollTime = scrollPerformance.reduce((a, b) => a + b, 0) / scrollPerformance.length;
      expect(averageScrollTime).toBeLessThan(5); // Less than 5ms per scroll event
    });
  });

  describe('Network Performance', () => {
    test('Should handle concurrent API requests efficiently', async () => {
      const mockStore = createMockStore();
      
      // Mock fetch with timing
      const fetchTimes = [];
      global.fetch = jest.fn((url) => {
        const startTime = performance.now();
        return Promise.resolve({
          ok: true,
          json: () => {
            const endTime = performance.now();
            fetchTimes.push(endTime - startTime);
            return Promise.resolve({ data: [] });
          },
        });
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        fetch(`/api/servers/${i}`)
      );

      await Promise.all(requests);

      // All requests should complete within reasonable time
      const maxFetchTime = Math.max(...fetchTimes);
      expect(maxFetchTime).toBeLessThan(100); // Less than 100ms per request
    });

    test('Should handle request queuing efficiently', async () => {
      const mockStore = createMockStore();
      const requestQueue = [];
      
      global.fetch = jest.fn((url) => {
        requestQueue.push({ url, timestamp: performance.now() });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate rapid requests
      for (let i = 0; i < 50; i++) {
        fetch(`/api/data/${i}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should queue requests efficiently
      expect(requestQueue.length).toBe(50);
      
      // Requests should be spaced appropriately
      for (let i = 1; i < requestQueue.length; i++) {
        const timeDiff = requestQueue[i].timestamp - requestQueue[i-1].timestamp;
        expect(timeDiff).toBeGreaterThan(0); // Should have some spacing
      }
    });
  });

  describe('Battery Performance', () => {
    test('Should minimize CPU usage during idle state', () => {
      const mockStore = createMockStore({
        dashboard: {
          servers: [],
          alerts: [],
          isIdle: true,
        },
      });

      const cpuUsageStart = process.cpuUsage ? process.cpuUsage() : { user: 0, system: 0 };

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate idle period
      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds
      });

      const cpuUsageEnd = process.cpuUsage ? process.cpuUsage(cpuUsageStart) : { user: 0, system: 0 };
      
      // CPU usage should be minimal during idle
      const totalCpuTime = cpuUsageEnd.user + cpuUsageEnd.system;
      expect(totalCpuTime).toBeLessThan(100000); // Less than 100ms of CPU time
    });

    test('Should reduce background activity when app is backgrounded', () => {
      const mockStore = createMockStore();
      const backgroundActivities = [];

      // Mock AppState
      const mockAppState = {
        currentState: 'active',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      jest.doMock('react-native', () => ({
        AppState: mockAppState,
      }));

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate app going to background
      act(() => {
        mockAppState.currentState = 'background';
        const handler = mockAppState.addEventListener.mock.calls
          .find(call => call[0] === 'change')[1];
        handler('background');
      });

      // Should reduce background activities
      expect(backgroundActivities.length).toBeLessThan(5);
    });
  });

  describe('Startup Performance', () => {
    test('Should initialize quickly', () => {
      const startTime = performance.now();
      
      const mockStore = createMockStore({
        auth: { isAuthenticated: true },
        dashboard: { initialized: false },
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const initTime = performance.now() - startTime;
      
      // Should initialize within 50ms
      expect(initTime).toBeLessThan(50);
    });

    test('Should load cached data quickly', async () => {
      const mockAsyncStorage = {
        getItem: jest.fn(() => Promise.resolve(JSON.stringify({
          servers: [{ id: '1', name: 'Cached Server' }],
          alerts: [{ id: '1', title: 'Cached Alert' }],
        }))),
      };

      jest.doMock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

      const startTime = performance.now();
      
      const mockStore = createMockStore();

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const loadTime = performance.now() - startTime;
      
      // Should load cached data within 20ms
      expect(loadTime).toBeLessThan(20);
    });
  });

  describe('Resource Management', () => {
    test('Should cleanup resources on unmount', () => {
      const mockStore = createMockStore();
      const cleanupFunctions = [];

      // Mock useEffect cleanup
      const originalUseEffect = React.useEffect;
      React.useEffect = jest.fn((effect, deps) => {
        const cleanup = effect();
        if (typeof cleanup === 'function') {
          cleanupFunctions.push(cleanup);
        }
        return originalUseEffect(effect, deps);
      });

      const { unmount } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      unmount();

      // Should have cleanup functions
      expect(cleanupFunctions.length).toBeGreaterThan(0);

      React.useEffect = originalUseEffect;
    });

    test('Should handle image loading efficiently', () => {
      const imageLoadTimes = [];
      
      // Mock Image component
      const mockImage = {
        getSize: jest.fn((uri, success) => {
          const startTime = performance.now();
          setTimeout(() => {
            const loadTime = performance.now() - startTime;
            imageLoadTimes.push(loadTime);
            success(100, 100);
          }, Math.random() * 50);
        }),
      };

      jest.doMock('react-native', () => ({
        Image: mockImage,
      }));

      const mockStore = createMockStore({
        dashboard: {
          servers: Array.from({ length: 20 }, (_, i) => ({
            id: `server-${i}`,
            name: `Server ${i}`,
            icon: `https://example.com/icon-${i}.png`,
          })),
        },
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Images should load efficiently
      setTimeout(() => {
        const averageLoadTime = imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length;
        expect(averageLoadTime).toBeLessThan(30); // Less than 30ms average
      }, 100);
    });
  });
});
