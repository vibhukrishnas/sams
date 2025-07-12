import React, { useRef } from 'react';
import {
  View,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  State,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { HapticFeedback } from '../haptic/HapticFeedback';

interface SwipeGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  enabled?: boolean;
  hapticFeedback?: boolean;
}

export const SwipeGestureHandler: React.FC<SwipeGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  enabled = true,
  hapticFeedback = true,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      if (hapticFeedback) {
        runOnJS(HapticFeedback.dragStart)();
      }
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      const { translationX, translationY, velocityX, velocityY } = event;
      
      // Determine swipe direction based on translation and velocity
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);
      
      if (absX > absY && absX > threshold) {
        // Horizontal swipe
        if (translationX > 0 && onSwipeRight) {
          runOnJS(onSwipeRight)();
          if (hapticFeedback) runOnJS(HapticFeedback.swipeAction)();
        } else if (translationX < 0 && onSwipeLeft) {
          runOnJS(onSwipeLeft)();
          if (hapticFeedback) runOnJS(HapticFeedback.swipeAction)();
        }
      } else if (absY > threshold) {
        // Vertical swipe
        if (translationY > 0 && onSwipeDown) {
          runOnJS(onSwipeDown)();
          if (hapticFeedback) runOnJS(HapticFeedback.swipeAction)();
        } else if (translationY < 0 && onSwipeUp) {
          runOnJS(onSwipeUp)();
          if (hapticFeedback) runOnJS(HapticFeedback.swipeAction)();
        }
      }
      
      // Reset position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      
      if (hapticFeedback) {
        runOnJS(HapticFeedback.dragEnd)();
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => void;
  refreshing?: boolean;
  threshold?: number;
  enabled?: boolean;
}

export const PullToRefreshHandler: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  refreshing = false,
  threshold = 80,
  enabled = true,
}) => {
  const translateY = useSharedValue(0);
  const isRefreshing = useSharedValue(false);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      if (!isRefreshing.value) {
        runOnJS(HapticFeedback.dragStart)();
      }
    },
    onActive: (event) => {
      if (!isRefreshing.value && event.translationY > 0) {
        translateY.value = event.translationY * 0.5; // Damping effect
        
        if (event.translationY > threshold) {
          runOnJS(HapticFeedback.pullToRefresh)();
        }
      }
    },
    onEnd: (event) => {
      if (!isRefreshing.value && event.translationY > threshold) {
        isRefreshing.value = true;
        runOnJS(onRefresh)();
        runOnJS(HapticFeedback.successAction)();
      }
      
      translateY.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  React.useEffect(() => {
    if (!refreshing) {
      isRefreshing.value = false;
    }
  }, [refreshing]);

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

interface DoubleTapProps {
  children: React.ReactNode;
  onDoubleTap: () => void;
  enabled?: boolean;
  hapticFeedback?: boolean;
}

export const DoubleTapHandler: React.FC<DoubleTapProps> = ({
  children,
  onDoubleTap,
  enabled = true,
  hapticFeedback = true,
}) => {
  const doubleTapRef = useRef<TapGestureHandler>(null);

  const onDoubleTapEvent = () => {
    if (hapticFeedback) {
      HapticFeedback.buttonPress();
    }
    onDoubleTap();
  };

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <TapGestureHandler
      ref={doubleTapRef}
      onActivated={onDoubleTapEvent}
      numberOfTaps={2}
    >
      <View>{children}</View>
    </TapGestureHandler>
  );
};

interface LongPressProps {
  children: React.ReactNode;
  onLongPress: () => void;
  minDurationMs?: number;
  enabled?: boolean;
  hapticFeedback?: boolean;
}

export const LongPressHandler: React.FC<LongPressProps> = ({
  children,
  onLongPress,
  minDurationMs = 500,
  enabled = true,
  hapticFeedback = true,
}) => {
  const onLongPressEvent = () => {
    if (hapticFeedback) {
      HapticFeedback.buttonLongPress();
    }
    onLongPress();
  };

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <LongPressGestureHandler
      onActivated={onLongPressEvent}
      minDurationMs={minDurationMs}
    >
      <View>{children}</View>
    </LongPressGestureHandler>
  );
};

interface PinchZoomProps {
  children: React.ReactNode;
  onPinch?: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
  enabled?: boolean;
}

export const PinchZoomHandler: React.FC<PinchZoomProps> = ({
  children,
  onPinch,
  minScale = 0.5,
  maxScale = 3,
  enabled = true,
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(HapticFeedback.dragStart)();
    },
    onActive: (event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(newScale, minScale), maxScale);
      
      if (onPinch) {
        runOnJS(onPinch)(scale.value);
      }
    },
    onEnd: () => {
      savedScale.value = scale.value;
      runOnJS(HapticFeedback.dragEnd)();
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <PinchGestureHandler onGestureEvent={pinchHandler}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </PinchGestureHandler>
  );
};

interface RotationProps {
  children: React.ReactNode;
  onRotation?: (rotation: number) => void;
  enabled?: boolean;
}

export const RotationHandler: React.FC<RotationProps> = ({
  children,
  onRotation,
  enabled = true,
}) => {
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const rotationHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(HapticFeedback.dragStart)();
    },
    onActive: (event) => {
      rotation.value = savedRotation.value + event.rotation;
      
      if (onRotation) {
        runOnJS(onRotation)(rotation.value);
      }
    },
    onEnd: () => {
      savedRotation.value = rotation.value;
      runOnJS(HapticFeedback.dragEnd)();
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}rad` }],
  }));

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <RotationGestureHandler onGestureEvent={rotationHandler}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </RotationGestureHandler>
  );
};

// Combined gesture handler for complex interactions
interface CombinedGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;
  enabled?: boolean;
}

export const CombinedGestureHandler: React.FC<CombinedGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onDoubleTap,
  onLongPress,
  onPinch,
  enabled = true,
}) => {
  let content = <>{children}</>;

  if (onPinch) {
    content = (
      <PinchZoomHandler onPinch={onPinch} enabled={enabled}>
        {content}
      </PinchZoomHandler>
    );
  }

  if (onLongPress) {
    content = (
      <LongPressHandler onLongPress={onLongPress} enabled={enabled}>
        {content}
      </LongPressHandler>
    );
  }

  if (onDoubleTap) {
    content = (
      <DoubleTapHandler onDoubleTap={onDoubleTap} enabled={enabled}>
        {content}
      </DoubleTapHandler>
    );
  }

  if (onSwipeLeft || onSwipeRight) {
    content = (
      <SwipeGestureHandler
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
        enabled={enabled}
      >
        {content}
      </SwipeGestureHandler>
    );
  }

  return content;
};

export default GestureHandlerRootView;
