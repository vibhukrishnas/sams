/**
 * Mock LinearGradient Component
 * Simple replacement for react-native-linear-gradient
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';

interface LinearGradientProps {
  colors: string[];
  style?: ViewStyle;
  children?: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

const LinearGradient: React.FC<LinearGradientProps> = ({ 
  colors, 
  style, 
  children,
  ...props 
}) => {
  // Use the first color as background for simplicity
  const backgroundColor = colors && colors.length > 0 ? colors[0] : '#000';
  
  return (
    <View style={[{ backgroundColor }, style]} {...props}>
      {children}
    </View>
  );
};

export default LinearGradient;
