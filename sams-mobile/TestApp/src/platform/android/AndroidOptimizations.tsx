import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  BackHandler,
  ToastAndroid,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import { getTheme } from '../../theme';

// Android-specific status bar configuration
export const AndroidStatusBar: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  if (Platform.OS !== 'android') return null;

  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={isDark ? '#1E1E1E' : '#FFFFFF'}
      translucent={false}
    />
  );
};

// Android-specific back handler
export const useAndroidBackHandler = (onBackPress: () => boolean) => {
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [onBackPress]);
};

// Android-specific toast messages
export const showAndroidToast = (message: string, duration: 'SHORT' | 'LONG' = 'SHORT') => {
  if (Platform.OS !== 'android') {
    console.log('Toast (iOS fallback):', message);
    return;
  }

  ToastAndroid.show(
    message,
    duration === 'SHORT' ? ToastAndroid.SHORT : ToastAndroid.LONG
  );
};

// Android-specific permissions
export const AndroidPermissions = {
  async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'SAMS needs access to your camera to scan QR codes',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('Camera permission error:', error);
      return false;
    }
  },

  async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'SAMS needs access to your microphone for voice responses',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('Microphone permission error:', error);
      return false;
    }
  },

  async requestStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'SAMS needs access to storage to save reports and logs',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('Storage permission error:', error);
      return false;
    }
  },

  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'SAMS needs permission to send you important alerts',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('Notification permission error:', error);
      return false;
    }
  },
};

// Android-specific Material Design components
export const MaterialCard: React.FC<{
  children: React.ReactNode;
  elevation?: number;
  isDark: boolean;
  style?: any;
}> = ({ children, elevation = 4, isDark, style }) => {
  const theme = getTheme(isDark);

  if (Platform.OS !== 'android') {
    // iOS fallback
    return (
      <View
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: 8,
          elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

// Android-specific floating action button
export const MaterialFAB: React.FC<{
  onPress: () => void;
  icon: string;
  isDark: boolean;
  size?: 'small' | 'large';
  position?: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft';
}> = ({ onPress, icon, isDark, size = 'large', position = 'bottomRight' }) => {
  const theme = getTheme(isDark);
  const { width, height } = Dimensions.get('window');

  const fabSize = size === 'large' ? 56 : 40;
  const iconSize = size === 'large' ? 24 : 18;

  const getPositionStyle = () => {
    const margin = 16;
    switch (position) {
      case 'bottomRight':
        return { bottom: margin, right: margin };
      case 'bottomLeft':
        return { bottom: margin, left: margin };
      case 'topRight':
        return { top: margin, right: margin };
      case 'topLeft':
        return { top: margin, left: margin };
      default:
        return { bottom: margin, right: margin };
    }
  };

  if (Platform.OS !== 'android') return null;

  return (
    <View
      style={[
        styles.fab,
        {
          width: fabSize,
          height: fabSize,
          borderRadius: fabSize / 2,
          backgroundColor: theme.colors.primary,
          elevation: 6,
        },
        getPositionStyle(),
      ]}
    >
      <Text style={{ color: '#FFFFFF', fontSize: iconSize }}>
        {icon}
      </Text>
    </View>
  );
};

// Android-specific ripple effect
export const AndroidRipple = {
  borderless: (color?: string) => ({
    android_ripple: {
      color: color || 'rgba(0, 0, 0, 0.2)',
      borderless: true,
    },
  }),
  
  bounded: (color?: string) => ({
    android_ripple: {
      color: color || 'rgba(0, 0, 0, 0.2)',
      borderless: false,
    },
  }),
};

// Android-specific design tokens (Material Design 3)
export const MaterialDesignTokens = {
  colors: {
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EADDFF',
    onPrimaryContainer: '#21005D',
    secondary: '#625B71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E8DEF8',
    onSecondaryContainer: '#1D192B',
    tertiary: '#7D5260',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD8E4',
    onTertiaryContainer: '#31111D',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    background: '#FFFBFE',
    onBackground: '#1C1B1F',
    surface: '#FFFBFE',
    onSurface: '#1C1B1F',
    surfaceVariant: '#E7E0EC',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#D0BCFF',
    surfaceDim: '#DDD8DD',
    surfaceBright: '#FFFBFE',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F7F2FA',
    surfaceContainer: '#F1ECF4',
    surfaceContainerHigh: '#ECE6F0',
    surfaceContainerHighest: '#E6E0E9',
  },
  
  typography: {
    displayLarge: {
      fontSize: 57,
      fontWeight: '400' as const,
      lineHeight: 64,
      letterSpacing: -0.25,
    },
    displayMedium: {
      fontSize: 45,
      fontWeight: '400' as const,
      lineHeight: 52,
      letterSpacing: 0,
    },
    displaySmall: {
      fontSize: 36,
      fontWeight: '400' as const,
      lineHeight: 44,
      letterSpacing: 0,
    },
    headlineLarge: {
      fontSize: 32,
      fontWeight: '400' as const,
      lineHeight: 40,
      letterSpacing: 0,
    },
    headlineMedium: {
      fontSize: 28,
      fontWeight: '400' as const,
      lineHeight: 36,
      letterSpacing: 0,
    },
    headlineSmall: {
      fontSize: 24,
      fontWeight: '400' as const,
      lineHeight: 32,
      letterSpacing: 0,
    },
    titleLarge: {
      fontSize: 22,
      fontWeight: '400' as const,
      lineHeight: 28,
      letterSpacing: 0,
    },
    titleMedium: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 24,
      letterSpacing: 0.15,
    },
    titleSmall: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      letterSpacing: 0.25,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
    labelLarge: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    labelMedium: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.5,
    },
    labelSmall: {
      fontSize: 11,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.5,
    },
  },
  
  elevation: {
    level0: 0,
    level1: 1,
    level2: 3,
    level3: 6,
    level4: 8,
    level5: 12,
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
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 28,
    full: 1000,
  },
};

// Android-specific component styles
export const MaterialStyles = StyleSheet.create({
  card: {
    backgroundColor: MaterialDesignTokens.colors.surface,
    borderRadius: MaterialDesignTokens.borderRadius.md,
    elevation: MaterialDesignTokens.elevation.level1,
  },
  
  button: {
    backgroundColor: MaterialDesignTokens.colors.primary,
    borderRadius: MaterialDesignTokens.borderRadius.full,
    paddingHorizontal: MaterialDesignTokens.spacing.lg,
    paddingVertical: MaterialDesignTokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: MaterialDesignTokens.elevation.level1,
  },
  
  buttonText: {
    color: MaterialDesignTokens.colors.onPrimary,
    fontSize: MaterialDesignTokens.typography.labelLarge.fontSize,
    fontWeight: MaterialDesignTokens.typography.labelLarge.fontWeight,
    letterSpacing: MaterialDesignTokens.typography.labelLarge.letterSpacing,
  },
  
  listItem: {
    backgroundColor: MaterialDesignTokens.colors.surface,
    paddingHorizontal: MaterialDesignTokens.spacing.md,
    paddingVertical: MaterialDesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: MaterialDesignTokens.colors.outlineVariant,
  },
  
  sectionHeader: {
    backgroundColor: MaterialDesignTokens.colors.surfaceVariant,
    paddingHorizontal: MaterialDesignTokens.spacing.md,
    paddingVertical: MaterialDesignTokens.spacing.sm,
  },
  
  sectionHeaderText: {
    fontSize: MaterialDesignTokens.typography.titleSmall.fontSize,
    fontWeight: MaterialDesignTokens.typography.titleSmall.fontWeight,
    color: MaterialDesignTokens.colors.onSurfaceVariant,
    letterSpacing: MaterialDesignTokens.typography.titleSmall.letterSpacing,
  },
  
  textField: {
    backgroundColor: MaterialDesignTokens.colors.surfaceVariant,
    borderRadius: MaterialDesignTokens.borderRadius.xs,
    paddingHorizontal: MaterialDesignTokens.spacing.md,
    paddingVertical: MaterialDesignTokens.spacing.sm,
    fontSize: MaterialDesignTokens.typography.bodyLarge.fontSize,
    color: MaterialDesignTokens.colors.onSurface,
  },
  
  chip: {
    backgroundColor: MaterialDesignTokens.colors.secondaryContainer,
    borderRadius: MaterialDesignTokens.borderRadius.sm,
    paddingHorizontal: MaterialDesignTokens.spacing.sm,
    paddingVertical: MaterialDesignTokens.spacing.xs,
  },
  
  chipText: {
    fontSize: MaterialDesignTokens.typography.labelMedium.fontSize,
    fontWeight: MaterialDesignTokens.typography.labelMedium.fontWeight,
    color: MaterialDesignTokens.colors.onSecondaryContainer,
  },
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

// Android Widget Configuration
export const AndroidWidgetConfig = {
  // Widget data provider
  getWidgetData: async () => {
    try {
      // Fetch latest alert data for widget
      const response = await fetch('http://192.168.1.10:8080/api/alerts/summary');
      const data = await response.json();

      return {
        criticalAlerts: data.critical || 0,
        totalAlerts: data.total || 0,
        serverStatus: data.serverStatus || 'unknown',
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Widget data fetch error:', error);
      return {
        criticalAlerts: 0,
        totalAlerts: 0,
        serverStatus: 'error',
        lastUpdate: new Date().toISOString(),
      };
    }
  },

  // Widget update interval (in minutes)
  updateInterval: 15,

  // Widget configuration
  widgetConfig: {
    small: {
      width: 160,
      height: 160,
      showDetails: false,
    },
    medium: {
      width: 360,
      height: 160,
      showDetails: true,
    },
    large: {
      width: 360,
      height: 360,
      showDetails: true,
      showChart: true,
    },
  },
};

export default {
  AndroidStatusBar,
  useAndroidBackHandler,
  showAndroidToast,
  AndroidPermissions,
  MaterialCard,
  MaterialFAB,
  AndroidRipple,
  MaterialDesignTokens,
  MaterialStyles,
  AndroidWidgetConfig,
};
