import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTheme } from '../../theme';

// iOS-specific status bar configuration
export const IOSStatusBar: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  if (Platform.OS !== 'ios') return null;

  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent={true}
    />
  );
};

// iOS-specific safe area wrapper
export const IOSSafeAreaWrapper: React.FC<{
  children: React.ReactNode;
  isDark: boolean;
  backgroundColor?: string;
}> = ({ children, isDark, backgroundColor }) => {
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  if (Platform.OS !== 'ios') {
    return <>{children}</>;
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: backgroundColor || theme.colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      {children}
    </SafeAreaView>
  );
};

// iOS-specific action sheet
interface IOSActionSheetOption {
  title: string;
  onPress: () => void;
  destructive?: boolean;
}

export const showIOSActionSheet = (
  title: string,
  message: string,
  options: IOSActionSheetOption[],
  cancelButtonIndex?: number
) => {
  if (Platform.OS !== 'ios') {
    // Fallback to Android alert
    const buttons = options.map((option) => ({
      text: option.title,
      onPress: option.onPress,
      style: option.destructive ? 'destructive' as const : 'default' as const,
    }));

    Alert.alert(title, message, buttons);
    return;
  }

  const optionTitles = options.map((option) => option.title);
  const destructiveButtonIndex = options.findIndex((option) => option.destructive);

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title,
      message,
      options: optionTitles,
      cancelButtonIndex: cancelButtonIndex ?? optionTitles.length - 1,
      destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
    },
    (buttonIndex) => {
      if (buttonIndex < options.length) {
        options[buttonIndex].onPress();
      }
    }
  );
};

// iOS-specific navigation bar
export const IOSNavigationBar: React.FC<{
  title: string;
  leftButton?: {
    title: string;
    onPress: () => void;
  };
  rightButton?: {
    title: string;
    onPress: () => void;
  };
  isDark: boolean;
}> = ({ title, leftButton, rightButton, isDark }) => {
  const theme = getTheme(isDark);

  if (Platform.OS !== 'ios') return null;

  return (
    <View style={[styles.navigationBar, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.navButton}>
        {leftButton && (
          <Text
            style={[styles.navButtonText, { color: theme.colors.primary }]}
            onPress={leftButton.onPress}
          >
            {leftButton.title}
          </Text>
        )}
      </View>
      
      <View style={styles.navTitle}>
        <Text style={[styles.navTitleText, { color: theme.colors.text }]}>
          {title}
        </Text>
      </View>
      
      <View style={styles.navButton}>
        {rightButton && (
          <Text
            style={[styles.navButtonText, { color: theme.colors.primary }]}
            onPress={rightButton.onPress}
          >
            {rightButton.title}
          </Text>
        )}
      </View>
    </View>
  );
};

// iOS-specific blur view
export const IOSBlurView: React.FC<{
  children: React.ReactNode;
  blurType?: 'light' | 'dark' | 'regular' | 'prominent';
  style?: any;
}> = ({ children, blurType = 'regular', style }) => {
  if (Platform.OS !== 'ios') {
    // Fallback for Android
    return (
      <View style={[style, { backgroundColor: 'rgba(255, 255, 255, 0.8)' }]}>
        {children}
      </View>
    );
  }

  // Note: In a real implementation, you would use @react-native-blur/blur
  // For now, we'll simulate the blur effect
  return (
    <View
      style={[
        style,
        {
          backgroundColor: blurType === 'dark' 
            ? 'rgba(0, 0, 0, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
        },
      ]}
    >
      {children}
    </View>
  );
};

// iOS-specific haptic patterns
export const IOSHapticPatterns = {
  lightImpact: () => {
    if (Platform.OS === 'ios') {
      // Use iOS-specific haptic feedback
      console.log('iOS Light Impact Haptic');
    }
  },
  
  mediumImpact: () => {
    if (Platform.OS === 'ios') {
      console.log('iOS Medium Impact Haptic');
    }
  },
  
  heavyImpact: () => {
    if (Platform.OS === 'ios') {
      console.log('iOS Heavy Impact Haptic');
    }
  },
  
  selectionChanged: () => {
    if (Platform.OS === 'ios') {
      console.log('iOS Selection Changed Haptic');
    }
  },
  
  notificationSuccess: () => {
    if (Platform.OS === 'ios') {
      console.log('iOS Success Notification Haptic');
    }
  },
  
  notificationWarning: () => {
    if (Platform.OS === 'ios') {
      console.log('iOS Warning Notification Haptic');
    }
  },
  
  notificationError: () => {
    if (Platform.OS === 'ios') {
      console.log('iOS Error Notification Haptic');
    }
  },
};

// iOS-specific design tokens
export const IOSDesignTokens = {
  colors: {
    systemBlue: '#007AFF',
    systemGreen: '#34C759',
    systemIndigo: '#5856D6',
    systemOrange: '#FF9500',
    systemPink: '#FF2D92',
    systemPurple: '#AF52DE',
    systemRed: '#FF3B30',
    systemTeal: '#5AC8FA',
    systemYellow: '#FFCC00',
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',
    label: '#000000',
    secondaryLabel: '#3C3C43',
    tertiaryLabel: '#3C3C43',
    quaternaryLabel: '#3C3C43',
    systemFill: '#78788033',
    secondarySystemFill: '#78788028',
    tertiarySystemFill: '#7676801E',
    quaternarySystemFill: '#74748014',
    placeholderText: '#3C3C4399',
    systemBackground: '#FFFFFF',
    secondarySystemBackground: '#F2F2F7',
    tertiarySystemBackground: '#FFFFFF',
    systemGroupedBackground: '#F2F2F7',
    secondarySystemGroupedBackground: '#FFFFFF',
    tertiarySystemGroupedBackground: '#F2F2F7',
    separator: '#3C3C4349',
    opaqueSeparator: '#C6C6C8',
    link: '#007AFF',
  },
  
  typography: {
    largeTitle: {
      fontSize: 34,
      fontWeight: '400' as const,
      lineHeight: 41,
    },
    title1: {
      fontSize: 28,
      fontWeight: '400' as const,
      lineHeight: 34,
    },
    title2: {
      fontSize: 22,
      fontWeight: '400' as const,
      lineHeight: 28,
    },
    title3: {
      fontSize: 20,
      fontWeight: '400' as const,
      lineHeight: 25,
    },
    headline: {
      fontSize: 17,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    body: {
      fontSize: 17,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    callout: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 21,
    },
    subhead: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    footnote: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
    },
    caption1: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    caption2: {
      fontSize: 11,
      fontWeight: '400' as const,
      lineHeight: 13,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
  },
};

// iOS-specific component styles
export const IOSStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: IOSDesignTokens.borderRadius.medium,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0, // Android shadow disabled
  },
  
  button: {
    backgroundColor: IOSDesignTokens.colors.systemBlue,
    borderRadius: IOSDesignTokens.borderRadius.small,
    paddingHorizontal: IOSDesignTokens.spacing.md,
    paddingVertical: IOSDesignTokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonText: {
    color: '#FFFFFF',
    fontSize: IOSDesignTokens.typography.body.fontSize,
    fontWeight: IOSDesignTokens.typography.headline.fontWeight,
  },
  
  listItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: IOSDesignTokens.spacing.md,
    paddingVertical: IOSDesignTokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IOSDesignTokens.colors.separator,
  },
  
  sectionHeader: {
    backgroundColor: IOSDesignTokens.colors.systemGroupedBackground,
    paddingHorizontal: IOSDesignTokens.spacing.md,
    paddingVertical: IOSDesignTokens.spacing.sm,
  },
  
  sectionHeaderText: {
    fontSize: IOSDesignTokens.typography.footnote.fontSize,
    fontWeight: '400',
    color: IOSDesignTokens.colors.secondaryLabel,
    textTransform: 'uppercase',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  navButton: {
    minWidth: 60,
  },
  navButtonText: {
    fontSize: 17,
    fontWeight: '400',
  },
  navTitle: {
    flex: 1,
    alignItems: 'center',
  },
  navTitleText: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default {
  IOSStatusBar,
  IOSSafeAreaWrapper,
  showIOSActionSheet,
  IOSNavigationBar,
  IOSBlurView,
  IOSHapticPatterns,
  IOSDesignTokens,
  IOSStyles,
};
