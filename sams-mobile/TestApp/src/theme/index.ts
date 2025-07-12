import { lightColors, darkColors, Colors } from './colors';
import { typography, textStyles } from './typography';
import { spacing, borderRadius, shadows, dimensions } from './spacing';

export interface Theme {
  colors: Colors;
  typography: typeof typography;
  textStyles: typeof textStyles;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  dimensions: typeof dimensions;
  isDark: boolean;
}

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  dimensions,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  dimensions,
  isDark: true,
};

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};

export * from './colors';
export * from './typography';
export * from './spacing';
