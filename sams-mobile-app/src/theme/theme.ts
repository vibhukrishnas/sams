import { DefaultTheme } from 'react-native-paper';

export const darkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3b82f6',
    accent: '#10b981',
    background: '#0f0f23',
    surface: '#1f1f2e',
    error: '#ef4444',
    text: '#ffffff',
    onSurface: '#d1d5db',
    disabled: '#6b7280',
    placeholder: '#9ca3af',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#f59e0b',
  },
};

export const colors = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',
  
  // Background colors
  background: '#0f0f23',
  surface: '#1f1f2e',
  surfaceVariant: '#374151',
  
  // Text colors
  text: '#ffffff',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  
  // Border colors
  border: '#374151',
  borderLight: '#4b5563',
  
  // Status colors
  online: '#10b981',
  offline: '#ef4444',
  warning: '#f59e0b',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
};
