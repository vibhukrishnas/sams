import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

interface QuickActionsCardProps {
  onAddServer: () => void;
  onGenerateReport: () => void;
  onViewAnalytics: () => void;
  onEmergencyAlert: () => void;
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onAddServer,
  onGenerateReport,
  onViewAnalytics,
  onEmergencyAlert,
}) => {
  const actions = [
    {
      id: 'add_server',
      title: 'Add Server',
      subtitle: 'Monitor new server',
      icon: 'add-circle',
      color: '#1976D2',
      onPress: onAddServer,
    },
    {
      id: 'generate_report',
      title: 'Generate Report',
      subtitle: 'Create PDF report',
      icon: 'assessment',
      color: '#4CAF50',
      onPress: onGenerateReport,
    },
    {
      id: 'view_analytics',
      title: 'Analytics',
      subtitle: 'View insights',
      icon: 'analytics',
      color: '#9C27B0',
      onPress: onViewAnalytics,
    },
    {
      id: 'emergency_alert',
      title: 'Emergency SOS',
      subtitle: 'Send alert',
      icon: 'emergency',
      color: '#F44336',
      onPress: onEmergencyAlert,
    },
  ];

  const renderAction = (action: typeof actions[0]) => (
    <TouchableOpacity
      key={action.id}
      style={styles.actionButton}
      onPress={action.onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[action.color, `${action.color}CC`]}
        style={styles.actionGradient}
      >
        <View style={styles.actionContent}>
          <Icon name={action.icon} size={24} color="#fff" />
          <Text style={styles.actionTitle}>{action.title}</Text>
          <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.actionsGrid}>
        {actions.map(renderAction)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionGradient: {
    padding: 16,
    minHeight: 80,
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default QuickActionsCard;
