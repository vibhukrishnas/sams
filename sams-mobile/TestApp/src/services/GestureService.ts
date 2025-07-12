import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Dimensions, Platform } from 'react-native';
import { store } from '../store/index';
import HapticService from './HapticService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GestureConfig {
  enabled: boolean;
  threshold: number;
  velocity: number;
  direction: 'horizontal' | 'vertical' | 'both';
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

interface PinchGesture {
  scale: number;
  velocity: number;
  focal: { x: number; y: number };
}

interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: (gesture: PinchGesture) => void;
  onPinchOut?: (gesture: PinchGesture) => void;
  onLongPress?: (position: { x: number; y: number }) => void;
  onDoubleTap?: (position: { x: number; y: number }) => void;
  onTripleTap?: (position: { x: number; y: number }) => void;
}

class GestureService {
  private isEnabled = true;
  private gestureConfigs: Map<string, GestureConfig> = new Map();
  private activeGestures: Set<string> = new Set();
  private lastTapTime = 0;
  private tapCount = 0;
  private tapTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeGestureConfigs();
    this.loadSettings();
  }

  /**
   * Initialize gesture configurations
   */
  private initializeGestureConfigs(): void {
    const configs: Array<[string, GestureConfig]> = [
      ['swipe', {
        enabled: true,
        threshold: 50, // minimum distance
        velocity: 500, // minimum velocity
        direction: 'both',
      }],
      ['pinch', {
        enabled: true,
        threshold: 0.1, // minimum scale change
        velocity: 0.5, // minimum velocity
        direction: 'both',
      }],
      ['longPress', {
        enabled: true,
        threshold: 500, // duration in ms
        velocity: 0,
        direction: 'both',
      }],
      ['doubleTap', {
        enabled: true,
        threshold: 300, // max time between taps
        velocity: 0,
        direction: 'both',
      }],
      ['pullToRefresh', {
        enabled: true,
        threshold: 100, // minimum pull distance
        velocity: 300,
        direction: 'vertical',
      }],
      ['edgeSwipe', {
        enabled: true,
        threshold: 20, // edge detection threshold
        velocity: 400,
        direction: 'horizontal',
      }],
    ];

    configs.forEach(([name, config]) => {
      this.gestureConfigs.set(name, config);
    });
  }

  /**
   * Load gesture settings from store
   */
  private loadSettings(): void {
    const state = store.getState();
    this.isEnabled = state.settings.app.gestureNavigation;
  }

  /**
   * Update gesture settings
   */
  updateSettings(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Create swipe gesture handler
   */
  createSwipeHandler(callbacks: GestureCallbacks) {
    return {
      onGestureEvent: (event: any) => {
        if (!this.isEnabled) return;

        const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;
        const config = this.gestureConfigs.get('swipe');
        
        if (!config?.enabled) return;

        // Determine swipe direction
        const absX = Math.abs(translationX);
        const absY = Math.abs(translationY);
        
        if (absX > config.threshold && absX > absY) {
          // Horizontal swipe
          if (Math.abs(velocityX) > config.velocity) {
            const direction = translationX > 0 ? 'right' : 'left';
            this.handleSwipe(direction, { translationX, translationY, velocityX, velocityY }, callbacks);
          }
        } else if (absY > config.threshold && absY > absX) {
          // Vertical swipe
          if (Math.abs(velocityY) > config.velocity) {
            const direction = translationY > 0 ? 'down' : 'up';
            this.handleSwipe(direction, { translationX, translationY, velocityX, velocityY }, callbacks);
          }
        }
      },
      onHandlerStateChange: (event: any) => {
        if (event.nativeEvent.state === State.END) {
          this.activeGestures.delete('swipe');
        }
      },
    };
  }

  /**
   * Handle swipe gesture
   */
  private handleSwipe(
    direction: 'left' | 'right' | 'up' | 'down',
    gesture: any,
    callbacks: GestureCallbacks
  ): void {
    if (this.activeGestures.has('swipe')) return;
    
    this.activeGestures.add('swipe');
    HapticService.swipeGesture();

    const swipeGesture: SwipeGesture = {
      direction,
      distance: Math.max(Math.abs(gesture.translationX), Math.abs(gesture.translationY)),
      velocity: Math.max(Math.abs(gesture.velocityX), Math.abs(gesture.velocityY)),
      duration: 0, // Would need to track start time
    };

    switch (direction) {
      case 'left':
        callbacks.onSwipeLeft?.();
        break;
      case 'right':
        callbacks.onSwipeRight?.();
        break;
      case 'up':
        callbacks.onSwipeUp?.();
        break;
      case 'down':
        callbacks.onSwipeDown?.();
        break;
    }
  }

  /**
   * Create pinch gesture handler
   */
  createPinchHandler(callbacks: GestureCallbacks) {
    return {
      onGestureEvent: (event: any) => {
        if (!this.isEnabled) return;

        const { scale, velocity, focalX, focalY } = event.nativeEvent;
        const config = this.gestureConfigs.get('pinch');
        
        if (!config?.enabled) return;

        const pinchGesture: PinchGesture = {
          scale,
          velocity,
          focal: { x: focalX, y: focalY },
        };

        if (scale > 1 + config.threshold) {
          callbacks.onPinchOut?.(pinchGesture);
        } else if (scale < 1 - config.threshold) {
          callbacks.onPinchIn?.(pinchGesture);
        }
      },
    };
  }

  /**
   * Create long press gesture handler
   */
  createLongPressHandler(callbacks: GestureCallbacks) {
    return {
      onGestureEvent: (event: any) => {
        if (!this.isEnabled) return;

        const { x, y } = event.nativeEvent;
        const config = this.gestureConfigs.get('longPress');
        
        if (!config?.enabled) return;

        HapticService.buttonLongPress();
        callbacks.onLongPress?.({ x, y });
      },
    };
  }

  /**
   * Create tap gesture handler with multi-tap support
   */
  createTapHandler(callbacks: GestureCallbacks) {
    return {
      onGestureEvent: (event: any) => {
        if (!this.isEnabled) return;

        const { x, y } = event.nativeEvent;
        const now = Date.now();
        const config = this.gestureConfigs.get('doubleTap');
        
        if (!config?.enabled) return;

        if (now - this.lastTapTime < config.threshold) {
          this.tapCount++;
        } else {
          this.tapCount = 1;
        }

        this.lastTapTime = now;

        // Clear existing timeout
        if (this.tapTimeout) {
          clearTimeout(this.tapTimeout);
        }

        // Set new timeout to handle tap completion
        this.tapTimeout = setTimeout(() => {
          this.handleTapComplete({ x, y }, callbacks);
          this.tapCount = 0;
        }, config.threshold);
      },
    };
  }

  /**
   * Handle tap completion
   */
  private handleTapComplete(position: { x: number; y: number }, callbacks: GestureCallbacks): void {
    switch (this.tapCount) {
      case 2:
        HapticService.buttonPress();
        callbacks.onDoubleTap?.(position);
        break;
      case 3:
        HapticService.buttonPress();
        callbacks.onTripleTap?.(position);
        break;
    }
  }

  /**
   * Create edge swipe detector
   */
  createEdgeSwipeHandler(edge: 'left' | 'right' | 'top' | 'bottom', callback: () => void) {
    return {
      onGestureEvent: (event: any) => {
        if (!this.isEnabled) return;

        const { translationX, translationY, x, y } = event.nativeEvent;
        const config = this.gestureConfigs.get('edgeSwipe');
        
        if (!config?.enabled) return;

        const isEdgeGesture = this.isEdgeGesture(edge, { x, y, translationX, translationY });
        
        if (isEdgeGesture) {
          HapticService.swipeGesture();
          callback();
        }
      },
    };
  }

  /**
   * Check if gesture is from screen edge
   */
  private isEdgeGesture(
    edge: 'left' | 'right' | 'top' | 'bottom',
    gesture: { x: number; y: number; translationX: number; translationY: number }
  ): boolean {
    const threshold = this.gestureConfigs.get('edgeSwipe')?.threshold || 20;
    
    switch (edge) {
      case 'left':
        return gesture.x < threshold && gesture.translationX > 50;
      case 'right':
        return gesture.x > screenWidth - threshold && gesture.translationX < -50;
      case 'top':
        return gesture.y < threshold && gesture.translationY > 50;
      case 'bottom':
        return gesture.y > screenHeight - threshold && gesture.translationY < -50;
      default:
        return false;
    }
  }

  /**
   * Create pull-to-refresh handler
   */
  createPullToRefreshHandler(callback: () => void) {
    return {
      onGestureEvent: (event: any) => {
        if (!this.isEnabled) return;

        const { translationY, velocityY } = event.nativeEvent;
        const config = this.gestureConfigs.get('pullToRefresh');
        
        if (!config?.enabled) return;

        if (translationY > config.threshold && velocityY > config.velocity) {
          HapticService.pullToRefresh();
          callback();
        }
      },
    };
  }

  /**
   * Navigation gesture shortcuts
   */
  
  // Back navigation (swipe from left edge)
  createBackGesture(callback: () => void) {
    return this.createEdgeSwipeHandler('left', callback);
  }

  // Forward navigation (swipe from right edge)
  createForwardGesture(callback: () => void) {
    return this.createEdgeSwipeHandler('right', callback);
  }

  // Menu gesture (swipe from top edge)
  createMenuGesture(callback: () => void) {
    return this.createEdgeSwipeHandler('top', callback);
  }

  // Quick actions (swipe from bottom edge)
  createQuickActionsGesture(callback: () => void) {
    return this.createEdgeSwipeHandler('bottom', callback);
  }

  /**
   * Alert-specific gestures
   */
  
  // Swipe to acknowledge
  createAcknowledgeGesture(callback: () => void) {
    return this.createSwipeHandler({
      onSwipeRight: callback,
    });
  }

  // Swipe to resolve
  createResolveGesture(callback: () => void) {
    return this.createSwipeHandler({
      onSwipeLeft: callback,
    });
  }

  // Swipe to snooze
  createSnoozeGesture(callback: () => void) {
    return this.createSwipeHandler({
      onSwipeUp: callback,
    });
  }

  // Long press for context menu
  createContextMenuGesture(callback: (position: { x: number; y: number }) => void) {
    return this.createLongPressHandler({
      onLongPress: callback,
    });
  }

  /**
   * Utility methods
   */
  
  // Enable/disable specific gesture
  setGestureEnabled(gestureName: string, enabled: boolean): void {
    const config = this.gestureConfigs.get(gestureName);
    if (config) {
      config.enabled = enabled;
    }
  }

  // Update gesture threshold
  setGestureThreshold(gestureName: string, threshold: number): void {
    const config = this.gestureConfigs.get(gestureName);
    if (config) {
      config.threshold = threshold;
    }
  }

  // Get gesture configuration
  getGestureConfig(gestureName: string): GestureConfig | undefined {
    return this.gestureConfigs.get(gestureName);
  }

  // Check if gesture is enabled
  isGestureEnabled(gestureName: string): boolean {
    const config = this.gestureConfigs.get(gestureName);
    return this.isEnabled && (config?.enabled ?? false);
  }

  // Get all gesture configurations
  getAllGestureConfigs(): Map<string, GestureConfig> {
    return new Map(this.gestureConfigs);
  }

  // Reset all gestures to default
  resetGestures(): void {
    this.initializeGestureConfigs();
  }
}

export default new GestureService();
