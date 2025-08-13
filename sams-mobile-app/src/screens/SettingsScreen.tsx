import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../theme/theme';

const SettingsScreen: React.FC = () => {
  const settings = [
    { title: 'Backend Configuration', icon: 'settings', description: 'Configure backend connection' },
    { title: 'Notifications', icon: 'notifications', description: 'Alert settings and preferences' },
    { title: 'Security', icon: 'security', description: 'PIN and authentication settings' },
    { title: 'About', icon: 'info', description: 'App version and information' },
  ];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[colors.primary, '#2563eb']} style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>App configuration and preferences</Text>
      </LinearGradient>
      
      <View style={styles.content}>
        {settings.map((setting, index) => (
          <TouchableOpacity key={index} style={styles.settingCard}>
            <Icon name={setting.icon} size={24} color={colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{setting.title}</Text>
              <Text style={styles.settingDescription}>{setting.description}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingTop: spacing.xl },
  headerTitle: { ...typography.heading1, color: '#ffffff', fontWeight: '700' },
  headerSubtitle: { ...typography.caption, color: 'rgba(255, 255, 255, 0.8)', marginTop: spacing.xs },
  content: { padding: spacing.md },
  settingCard: { 
    backgroundColor: colors.surface, 
    padding: spacing.md, 
    borderRadius: 12, 
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingContent: { flex: 1, marginLeft: spacing.md },
  settingTitle: { ...typography.body, color: colors.text, fontWeight: '500' },
  settingDescription: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});

export default SettingsScreen;
