import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Alert } from '../../store/api/samsApi';

interface AlertSummaryCardProps {
  alerts: Alert[];
  onViewAll: () => void;
  maxItems?: number;
}

const AlertSummaryCard: React.FC<AlertSummaryCardProps> = ({
  alerts,
  onViewAll,
  maxItems = 3,
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'notifications';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const renderAlertItem = ({ item }: { item: Alert }) => (
    <View style={styles.alertItem}>
      <View style={styles.alertLeft}>
        <View style={[
          styles.severityIndicator,
          { backgroundColor: getSeverityColor(item.severity) }
        ]}>
          <Icon
            name={getSeverityIcon(item.severity)}
            size={16}
            color="#fff"
          />
        </View>
        
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.alertServer} numberOfLines={1}>
            {item.server}
          </Text>
        </View>
      </View>
      
      <View style={styles.alertRight}>
        <Text style={styles.alertTime}>
          {formatTime(item.timestamp)}
        </Text>
        {item.acknowledged && (
          <Icon name="check-circle" size={16} color="#4CAF50" />
        )}
      </View>
    </View>
  );

  const displayAlerts = alerts.slice(0, maxItems);
  const hasMoreAlerts = alerts.length > maxItems;

  if (alerts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Icon name="check-circle" size={48} color="#4CAF50" />
          <Text style={styles.emptyTitle}>All Clear!</Text>
          <Text style={styles.emptySubtitle}>No active alerts at this time</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayAlerts}
        renderItem={renderAlertItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      
      {hasMoreAlerts && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>
            View all {alerts.length} alerts
          </Text>
          <Icon name="arrow-forward" size={16} color="#1976D2" />
        </TouchableOpacity>
      )}
      
      {!hasMoreAlerts && alerts.length > 0 && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View alert details</Text>
          <Icon name="arrow-forward" size={16} color="#1976D2" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alertLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  alertServer: {
    fontSize: 12,
    color: '#666',
  },
  alertRight: {
    alignItems: 'flex-end',
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  viewAllText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default AlertSummaryCard;
