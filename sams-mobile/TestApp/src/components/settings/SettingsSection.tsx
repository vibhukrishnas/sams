import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

interface SettingsSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  style?: any;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  icon,
  children,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
        {icon && (
          <Icon
            name={icon}
            size={20}
            color={theme.colors.primary}
            style={styles.icon}
          />
        )}
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          {title}
        </Text>
      </View>
      
      <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});

export default SettingsSection;
