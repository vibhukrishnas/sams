import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { getTheme } from '../theme';

const AboutScreen: React.FC = () => {
  const isDark = useAppSelector(state => state.ui.theme === 'dark');
  const theme = getTheme(isDark);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>
        About Screen - Coming Soon
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AboutScreen;
