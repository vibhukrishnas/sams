import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setTheme, setSystemTheme } from '../store/slices/settingsSlice';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  
  // Background colors
  background: string;
  surface: string;
  card: string;
  modal: string;
  overlay: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Severity colors
  critical: string;
  warningAlert: string;
  infoAlert: string;
  
  // Border and divider colors
  border: string;
  divider: string;
  shadow: string;
  
  // Interactive colors
  ripple: string;
  highlight: string;
  disabled: string;
  
  // Navigation colors
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
  headerBackground: string;
  headerText: string;
}

export interface Theme {
  colors: ThemeColors;
  dark: boolean;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: string; lineHeight: number };
    h2: { fontSize: number; fontWeight: string; lineHeight: number };
    h3: { fontSize: number; fontWeight: string; lineHeight: number };
    h4: { fontSize: number; fontWeight: string; lineHeight: number };
    body1: { fontSize: number; fontWeight: string; lineHeight: number };
    body2: { fontSize: number; fontWeight: string; lineHeight: number };
    caption: { fontSize: number; fontWeight: string; lineHeight: number };
    button: { fontSize: number; fontWeight: string; lineHeight: number };
  };
  shadows: {
    sm: object;
    md: object;
    lg: object;
  };
}

const lightColors: ThemeColors = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  secondary: '#03DAC6',
  accent: '#FF4081',
  
  background: '#FFFFFF',
  surface: '#F8F9FA',
  card: '#FFFFFF',
  modal: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  text: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
  textInverse: '#FFFFFF',
  
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  critical: '#F44336',
  warningAlert: '#FF9800',
  infoAlert: '#2196F3',
  
  border: '#E0E0E0',
  divider: '#F0F0F0',
  shadow: '#000000',
  
  ripple: 'rgba(25, 118, 210, 0.12)',
  highlight: 'rgba(25, 118, 210, 0.08)',
  disabled: '#F5F5F5',
  
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#1976D2',
  tabBarInactive: '#9E9E9E',
  headerBackground: '#1976D2',
  headerText: '#FFFFFF',
};

const darkColors: ThemeColors = {
  primary: '#90CAF9',
  primaryDark: '#42A5F5',
  primaryLight: '#BBDEFB',
  secondary: '#80CBC4',
  accent: '#FF80AB',
  
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2D2D2D',
  modal: '#2D2D2D',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textDisabled: '#666666',
  textInverse: '#000000',
  
  success: '#81C784',
  warning: '#FFB74D',
  error: '#E57373',
  info: '#64B5F6',
  
  critical: '#E57373',
  warningAlert: '#FFB74D',
  infoAlert: '#64B5F6',
  
  border: '#404040',
  divider: '#333333',
  shadow: '#000000',
  
  ripple: 'rgba(144, 202, 249, 0.12)',
  highlight: 'rgba(144, 202, 249, 0.08)',
  disabled: '#333333',
  
  tabBarBackground: '#1E1E1E',
  tabBarActive: '#90CAF9',
  tabBarInactive: '#666666',
  headerBackground: '#1E1E1E',
  headerText: '#FFFFFF',
};

const baseTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
    h2: { fontSize: 28, fontWeight: 'bold', lineHeight: 36 },
    h3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
    h4: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    body1: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 },
    body2: { fontSize: 14, fontWeight: 'normal', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: 'normal', lineHeight: 16 },
    button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

const lightTheme: Theme = {
  colors: lightColors,
  dark: false,
  ...baseTheme,
};

const darkTheme: Theme = {
  colors: darkColors,
  dark: true,
  ...baseTheme,
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { app } = useAppSelector(state => state.settings);
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
      dispatch(setSystemTheme(colorScheme || 'light'));
    });

    return () => subscription?.remove();
  }, [dispatch]);

  useEffect(() => {
    // Load saved theme preference
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme) {
        const themeMode = JSON.parse(savedTheme);
        dispatch(setTheme(themeMode));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (themeMode: string) => {
    try {
      await AsyncStorage.setItem('theme_preference', JSON.stringify(themeMode));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const getCurrentTheme = (): Theme => {
    if (app.theme === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return app.theme === 'dark' ? darkTheme : lightTheme;
  };

  const isDark = getCurrentTheme().dark;

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    dispatch(setTheme(newTheme));
    saveThemePreference(newTheme);
  };

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(mode));
    saveThemePreference(mode);
  };

  // Update status bar based on theme
  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
  }, [isDark]);

  const contextValue: ThemeContextType = {
    theme: getCurrentTheme(),
    isDark,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export { lightTheme, darkTheme };
