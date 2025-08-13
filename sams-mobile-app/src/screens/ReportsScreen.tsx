import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../theme/theme';

const ReportsScreen: React.FC = () => {
  const reports = [
    { title: 'System Performance', icon: 'trending-up', color: colors.primary },
    { title: 'Network Activity', icon: 'wifi', color: colors.success },
    { title: 'Security Audit', icon: 'security', color: colors.warning },
    { title: 'Error Analysis', icon: 'error', color: colors.danger },
  ];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={[colors.warning, '#d97706']} style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSubtitle}>System analysis and insights</Text>
      </LinearGradient>
      
      <View style={styles.content}>
        {reports.map((report, index) => (
          <TouchableOpacity key={index} style={styles.reportCard}>
            <Icon name={report.icon} size={32} color={report.color} />
            <Text style={styles.reportTitle}>{report.title}</Text>
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
  reportCard: { 
    backgroundColor: colors.surface, 
    padding: spacing.lg, 
    borderRadius: 12, 
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportTitle: { ...typography.body, color: colors.text, marginLeft: spacing.md, fontWeight: '500' },
});

export default ReportsScreen;
