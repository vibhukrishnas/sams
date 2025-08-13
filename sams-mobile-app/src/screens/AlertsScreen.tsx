import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../theme/theme';

const AlertsScreen: React.FC = () => {
  const alerts = [
    { title: 'High CPU Usage', message: 'CPU usage exceeded 80%', type: 'warning', time: '2 min ago' },
    { title: 'System Connected', message: 'Backend connection established', type: 'success', time: '5 min ago' },
    { title: 'Memory Alert', message: 'Memory usage is high', type: 'critical', time: '10 min ago' },
  ];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[colors.danger, '#dc2626']} style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        <Text style={styles.headerSubtitle}>System notifications and warnings</Text>
      </LinearGradient>
      
      <View style={styles.content}>
        {alerts.map((alert, index) => (
          <View key={index} style={[styles.alertCard, { borderLeftColor: colors[alert.type as keyof typeof colors] }]}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.alertTime}>{alert.time}</Text>
          </View>
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
  alertCard: { 
    backgroundColor: colors.surface, 
    padding: spacing.md, 
    borderRadius: 12, 
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  alertMessage: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  alertTime: { ...typography.small, color: colors.textMuted, marginTop: spacing.sm },
});

export default AlertsScreen;
