import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  AccessibilityInfo,
  AccessibilityRole,
  AccessibilityState,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { HapticFeedback } from '../haptic/HapticFeedback';

interface AccessibilityWrapperProps {
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';
  announceOnFocus?: string;
  focusable?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

export const AccessibilityWrapper: React.FC<AccessibilityWrapperProps> = ({
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  accessibilityValue,
  onPress,
  onLongPress,
  disabled = false,
  style,
  testID,
  hapticType = 'light',
  announceOnFocus,
  focusable = true,
  importantForAccessibility = 'auto',
}) => {
  const handlePress = () => {
    if (disabled) return;
    
    // Provide haptic feedback
    HapticFeedback.trigger(hapticType);
    
    // Announce action if screen reader is enabled
    if (announceOnFocus) {
      AccessibilityInfo.announceForAccessibility(announceOnFocus);
    }
    
    onPress?.();
  };

  const handleLongPress = () => {
    if (disabled) return;
    
    // Provide stronger haptic feedback for long press
    HapticFeedback.trigger('medium');
    
    onLongPress?.();
  };

  const accessibilityProps = {
    accessible: true,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    accessibilityState: {
      ...accessibilityState,
      disabled,
    },
    accessibilityValue,
    testID,
    focusable: focusable && !disabled,
    importantForAccessibility,
  };

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        {...accessibilityProps}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        style={[style, disabled && { opacity: 0.5 }]}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      {...accessibilityProps}
      style={[style, disabled && { opacity: 0.5 }]}
    >
      {children}
    </View>
  );
};

// Accessibility-enhanced Text component
interface AccessibleTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
  adjustsFontSizeToFit?: boolean;
  allowFontScaling?: boolean;
  minimumFontScale?: number;
  maxFontSizeMultiplier?: number;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

export const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
  testID,
  adjustsFontSizeToFit = false,
  allowFontScaling = true,
  minimumFontScale = 0.5,
  maxFontSizeMultiplier = 2.0,
  importantForAccessibility = 'auto',
}) => {
  return (
    <Text
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      testID={testID}
      style={style}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      allowFontScaling={allowFontScaling}
      minimumFontScale={minimumFontScale}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      importantForAccessibility={importantForAccessibility}
    >
      {children}
    </Text>
  );
};

// High contrast mode detector
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const checkHighContrast = async () => {
      try {
        const isEnabled = await AccessibilityInfo.isHighTextContrastEnabled();
        setIsHighContrast(isEnabled);
      } catch (error) {
        console.warn('Failed to check high contrast mode:', error);
      }
    };

    checkHighContrast();

    const subscription = AccessibilityInfo.addEventListener(
      'highTextContrastDidChange',
      setIsHighContrast
    );

    return () => subscription?.remove();
  }, []);

  return isHighContrast;
};

// Screen reader detector
export const useScreenReader = () => {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = React.useState(false);

  React.useEffect(() => {
    const checkScreenReader = async () => {
      try {
        const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        setIsScreenReaderEnabled(isEnabled);
      } catch (error) {
        console.warn('Failed to check screen reader:', error);
      }
    };

    checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => subscription?.remove();
  }, []);

  return isScreenReaderEnabled;
};

// Reduced motion detector
export const useReducedMotion = () => {
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = React.useState(false);

  React.useEffect(() => {
    const checkReducedMotion = async () => {
      try {
        const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        setIsReducedMotionEnabled(isEnabled);
      } catch (error) {
        console.warn('Failed to check reduced motion:', error);
      }
    };

    checkReducedMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotionEnabled
    );

    return () => subscription?.remove();
  }, []);

  return isReducedMotionEnabled;
};

// Accessibility announcer utility
export const announceForAccessibility = (message: string) => {
  AccessibilityInfo.announceForAccessibility(message);
};

// Focus management utility
export const setAccessibilityFocus = (reactTag: number) => {
  AccessibilityInfo.setAccessibilityFocus(reactTag);
};

// Accessibility info provider
export const AccessibilityInfoProvider: React.FC<{
  children: (info: {
    isScreenReaderEnabled: boolean;
    isHighContrastEnabled: boolean;
    isReducedMotionEnabled: boolean;
  }) => React.ReactNode;
}> = ({ children }) => {
  const isScreenReaderEnabled = useScreenReader();
  const isHighContrastEnabled = useHighContrastMode();
  const isReducedMotionEnabled = useReducedMotion();

  return (
    <>
      {children({
        isScreenReaderEnabled,
        isHighContrastEnabled,
        isReducedMotionEnabled,
      })}
    </>
  );
};

export default AccessibilityWrapper;
