import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getTheme } from '../../theme';
import { HapticFeedback } from '../haptic/HapticFeedback';

interface AlertHistoryItem {
  id: string;
  alertId: string;
  action: 'created' | 'acknowledged' | 'resolved' | 'snoozed' | 'escalated' | 'commented';
  timestamp: string;
  user: string;
  details?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  serverName: string;
  alertTitle: string;
}

interface Props {
  alertId?: string; // If provided, show history for specific alert
  isDark: boolean;
  onItemPress?: (item: AlertHistoryItem) => void;
}

const AlertHistory: React.FC<Props> = ({ alertId, isDark, onItemPress }) => {
  const theme = getTheme(isDark);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'actions' | 'comments'>('all');

  useEffect(() => {
    loadHistory();
  }, [alertId, filter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      // Simulate API call - replace with actual API
      const mockHistory: AlertHistoryItem[] = [
        {
          id: '1',
          alertId: alertId || 'alert-001',
          action: 'created',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'System',
          severity: 'critical',
          serverName: 'web-server-01',
          alertTitle: 'High CPU Usage Detected',
        },
        {
          id: '2',
          alertId: alertId || 'alert-001',
          action: 'acknowledged',
          timestamp: new Date(Date.now() - 3000000).toISOString(),
          user: 'John Doe',
          details: 'Investigating the issue',
          severity: 'critical',
          serverName: 'web-server-01',
          alertTitle: 'High CPU Usage Detected',
        },
        {
          id: '3',
          alertId: alertId || 'alert-001',
          action: 'commented',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          user: 'Jane Smith',
          details: 'CPU usage spike caused by batch job. Optimizing query.',
          severity: 'critical',
          serverName: 'web-server-01',
          alertTitle: 'High CPU Usage Detected',
        },
        {
          id: '4',
          alertId: alertId || 'alert-001',
          action: 'resolved',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          user: 'John Doe',
          details: 'Query optimization completed. CPU usage back to normal.',
          severity: 'critical',
          serverName: 'web-server-01',
          alertTitle: 'High CPU Usage Detected',
        },
      ];

      // Filter based on current filter
      const filteredHistory = mockHistory.filter(item => {
        if (filter === 'actions') {
          return ['created', 'acknowledged', 'resolved', 'snoozed', 'escalated'].includes(item.action);
        }
        if (filter === 'comments') {
          return item.action === 'commented';
        }
        return true;
      });

      setHistory(filteredHistory);
    } catch (error) {
      console.error('Error loading alert history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    HapticFeedback.pullToRefresh();
    loadHistory();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return 'add-alert';
      case 'acknowledged': return 'visibility';
      case 'resolved': return 'check-circle';
      case 'snoozed': return 'snooze';
      case 'escalated': return 'trending-up';
      case 'commented': return 'comment';
      default: return 'info';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return '#FF9800';
      case 'acknowledged': return '#2196F3';
      case 'resolved': return '#4CAF50';
      case 'snoozed': return '#9C27B0';
      case 'escalated': return '#F44336';
      case 'commented': return '#607D8B';
      default: return theme.colors.textSecondary;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      case 'info': return '#2196F3';
      default: return theme.colors.textSecondary;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderHistoryItem = ({ item }: { item: AlertHistoryItem }) => (
    <TouchableOpacity
      style={[styles.historyItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => {
        HapticFeedback.buttonPress();
        onItemPress?.(item);
      }}
    >
      <View style={styles.itemHeader}>
        <View style={styles.actionContainer}>
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: getActionColor(item.action) + '20' }
            ]}
          >
            <Icon
              name={getActionIcon(item.action)}
              size={16}
              color={getActionColor(item.action)}
            />
          </View>
          <Text style={[styles.actionText, { color: theme.colors.text }]}>
            {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
          </Text>
        </View>
        
        <View style={styles.metaContainer}>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(item.severity) }
            ]}
          >
            <Text style={styles.severityText}>
              {item.severity.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>

      <View style={styles.itemContent}>
        <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
          {item.alertTitle}
        </Text>
        <Text style={[styles.serverName, { color: theme.colors.textSecondary }]}>
          {item.serverName}
        </Text>
        
        {item.details && (
          <Text style={[styles.details, { color: theme.colors.textSecondary }]}>
            {item.details}
          </Text>
        )}
        
        <Text style={[styles.user, { color: theme.colors.textSecondary }]}>
          by {item.user}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {['all', 'actions', 'comments'].map((filterType) => (
        <TouchableOpacity
          key={filterType}
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === filterType
                ? theme.colors.primary
                : theme.colors.surface,
              borderColor: theme.colors.primary,
            },
          ]}
          onPress={() => {
            setFilter(filterType as any);
            HapticFeedback.buttonPress();
          }}
        >
          <Text
            style={[
              styles.filterButtonText,
              {
                color: filter === filterType
                  ? '#FFFFFF'
                  : theme.colors.text,
              },
            ]}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading history...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderFilterButtons()}
      
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="history" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No history available
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  historyItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaContainer: {
    alignItems: 'flex-end',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
  },
  itemContent: {
    marginLeft: 40,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  serverName: {
    fontSize: 12,
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  user: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default AlertHistory;
