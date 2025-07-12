import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { getTheme } from '../theme';
import { BottomTabScreenProps } from '../navigation/types';

type Props = BottomTabScreenProps<'Servers'>;

const ServersScreen: React.FC<Props> = () => {
  const isDark = useAppSelector(state => state.ui.theme === 'dark');
  const theme = getTheme(isDark);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>
        Servers Screen - Coming Soon
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

export default ServersScreen;
