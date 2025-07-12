import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { getTheme } from '../theme';
import { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'EditServer'>;

const EditServerScreen: React.FC<Props> = ({ route }) => {
  const { serverId } = route.params;
  const isDark = useAppSelector(state => state.ui.theme === 'dark');
  const theme = getTheme(isDark);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>
        Edit Server Screen - Server ID: {serverId}
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

export default EditServerScreen;
