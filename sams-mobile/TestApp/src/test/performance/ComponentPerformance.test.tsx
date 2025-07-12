/**
 * Component Performance Tests
 * Tests for measuring component render performance and memory usage
 */

import React from 'react';
import { renderWithProviders, measureRenderTime, getMemoryUsage, generateMockAlerts } from '../utils';
import AlertsScreen from '../../screens/AlertsScreen';
import AlertCard from '../../components/alerts/AlertCard';
import { createMockNavigation, createMockRoute } from '../utils';

describe('Component Performance Tests', () => {
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute({ name: 'Alerts' });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear memory before each test
    if (global.gc) {
      global.gc();
    }
  });

  describe('AlertCard Performance', () => {
    it('renders single alert card within performance threshold', async () => {
      const mockAlert = generateMockAlerts(1)[0];
      
      const renderTime = await measureRenderTime(() => {
        renderWithProviders(
          <AlertCard
            alert={mockAlert}
            onPress={jest.fn()}
            onAcknowledge={jest.fn()}
            onResolve={jest.fn()}
            isDark={false}
          />
        );
      });

      // Should render within 16ms (60fps)
      expect(renderTime).toBeLessThan(16);
    });

    it('handles multiple alert cards efficiently', async () => {
      const mockAlerts = generateMockAlerts(100);
      
      const renderTime = await measureRenderTime(() => {
        mockAlerts.forEach(alert => {
          renderWithProviders(
            <AlertCard
              alert={alert}
              onPress={jest.fn()}
              onAcknowledge={jest.fn()}
              onResolve={jest.fn()}
              isDark={false}
            />
          );
        });
      });

      // Should render 100 cards within 500ms
      expect(renderTime).toBeLessThan(500);
    });

    it('maintains consistent performance with complex alert data', async () => {
      const complexAlert = {
        ...generateMockAlerts(1)[0],
        title: 'A'.repeat(1000), // Very long title
        message: 'B'.repeat(5000), // Very long message
        metadata: {
          tags: Array.from({ length: 100 }, (_, i) => `tag-${i}`),
          details: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`key-${i}`, `value-${i}`])
          ),
        },
      };

      const renderTime = await measureRenderTime(() => {
        renderWithProviders(
          <AlertCard
            alert={complexAlert}
            onPress={jest.fn()}
            onAcknowledge={jest.fn()}
            onResolve={jest.fn()}
            isDark={false}
          />
        );
      });

      // Should handle complex data within 50ms
      expect(renderTime).toBeLessThan(50);
    });
  });

  describe('AlertsScreen Performance', () => {
    it('loads initial screen within performance threshold', async () => {
      const renderTime = await measureRenderTime(() => {
        renderWithProviders(
          <AlertsScreen navigation={mockNavigation} route={mockRoute} />
        );
      });

      // Initial screen load should be under 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('handles large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = generateMockAlerts(1000);
      
      const initialMemory = getMemoryUsage();
      
      const renderTime = await measureRenderTime(() => {
        renderWithProviders(
          <AlertsScreen navigation={mockNavigation} route={mockRoute} />,
          {
            initialState: {
              alerts: {
                alerts: largeDataset,
                loading: false,
                error: null,
              },
            },
          }
        );
      });

      const finalMemory = getMemoryUsage();

      // Should render large dataset within 200ms
      expect(renderTime).toBeLessThan(200);

      // Memory usage should not increase dramatically
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
      }
    });

    it('maintains smooth scrolling performance', async () => {
      const { getByTestId } = renderWithProviders(
        <AlertsScreen navigation={mockNavigation} route={mockRoute} />,
        {
          initialState: {
            alerts: {
              alerts: generateMockAlerts(500),
              loading: false,
              error: null,
            },
          },
        }
      );

      const alertsList = getByTestId('alerts-list');
      
      // Measure scroll performance
      const scrollStartTime = performance.now();
      
      // Simulate rapid scrolling
      for (let i = 0; i < 10; i++) {
        alertsList.props.onScroll({
          nativeEvent: {
            contentOffset: { y: i * 100 },
            contentSize: { height: 50000 },
            layoutMeasurement: { height: 600 },
          },
        });
      }
      
      const scrollEndTime = performance.now();
      const scrollTime = scrollEndTime - scrollStartTime;

      // Scroll operations should be fast
      expect(scrollTime).toBeLessThan(50);
    });
  });

  describe('Memory Management', () => {
    it('properly cleans up component memory', async () => {
      const initialMemory = getMemoryUsage();
      
      // Render and unmount multiple components
      for (let i = 0; i < 100; i++) {
        const { unmount } = renderWithProviders(
          <AlertCard
            alert={generateMockAlerts(1)[0]}
            onPress={jest.fn()}
            onAcknowledge={jest.fn()}
            onResolve={jest.fn()}
            isDark={false}
          />
        );
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = getMemoryUsage();

      // Memory should not leak significantly
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
      }
    });

    it('handles rapid component mounting/unmounting', async () => {
      const components: any[] = [];
      
      const startTime = performance.now();
      
      // Rapidly mount components
      for (let i = 0; i < 50; i++) {
        const component = renderWithProviders(
          <AlertCard
            alert={generateMockAlerts(1)[0]}
            onPress={jest.fn()}
            onAcknowledge={jest.fn()}
            onResolve={jest.fn()}
            isDark={false}
          />
        );
        components.push(component);
      }
      
      // Rapidly unmount components
      components.forEach(component => component.unmount());
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid mounting/unmounting efficiently
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Animation Performance', () => {
    it('maintains 60fps during animations', async () => {
      const { getByTestId } = renderWithProviders(
        <AlertsScreen navigation={mockNavigation} route={mockRoute} />
      );

      const animatedElement = getByTestId('animated-element');
      
      // Simulate animation frames
      const frameCount = 60; // 1 second at 60fps
      const frameDuration = 1000 / 60; // ~16.67ms per frame
      
      const startTime = performance.now();
      
      for (let i = 0; i < frameCount; i++) {
        // Simulate animation update
        animatedElement.props.onAnimationFrame?.(i / frameCount);
        
        // Advance time
        jest.advanceTimersByTime(frameDuration);
      }
      
      const endTime = performance.now();
      const actualDuration = endTime - startTime;
      
      // Animation should complete close to expected time
      expect(actualDuration).toBeWithinRange(900, 1100); // Within 10% of 1 second
    });
  });

  describe('Bundle Size Impact', () => {
    it('component imports do not significantly increase bundle size', () => {
      // This test would typically be run with a bundler analyzer
      // For now, we'll check that components are properly tree-shakeable
      
      const AlertCardModule = require('../../components/alerts/AlertCard');
      const AlertsScreenModule = require('../../screens/AlertsScreen');
      
      // Verify modules export only what's needed
      expect(typeof AlertCardModule.default).toBe('function');
      expect(typeof AlertsScreenModule.default).toBe('function');
      
      // Check for unnecessary exports
      const alertCardExports = Object.keys(AlertCardModule);
      const alertsScreenExports = Object.keys(AlertsScreenModule);
      
      expect(alertCardExports.length).toBeLessThanOrEqual(2); // default + maybe one more
      expect(alertsScreenExports.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Network Performance', () => {
    it('handles concurrent API requests efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        fetch(`/api/alerts/${i}`)
      );
      
      await Promise.all(requests);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Concurrent requests should not take much longer than a single request
      expect(totalTime).toBeLessThan(200);
    });
  });
});
