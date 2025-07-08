import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getAlerts, markAlertAsRead} from '../../utils/storage';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, critical, warning

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const alertList = await getAlerts();
      setAlerts(alertList);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      await markAlertAsRead(alertId);
      await loadAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all alerts as read?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Mark All',
          onPress: async () => {
            try {
              const unreadAlerts = alerts.filter(alert => !alert.read);
              for (const alert of unreadAlerts) {
                await markAlertAsRead(alert.id);
              }
              await loadAlerts();
            } catch (error) {
              console.error('Error marking all alerts as read:', error);
            }
          },
        },
      ]
    );
  };

  const getFilteredAlerts = () => {
    switch (filter) {
      case 'unread':
        return alerts.filter(alert => !alert.read);
      case 'critical':
        return alerts.filter(alert => alert.severity === 'critical');
      case 'warning':
        return alerts.filter(alert => alert.severity === 'warning');
      default:
        return alerts;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'warning':
        return '#ea580c';
      case 'info':
        return '#1e3a8a';
      default:
        return '#6b7280';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'notifications';
    }
  };

  const renderAlertCard = (alert) => (
    <View key={alert.id} style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.alertInfo}>
          <View style={styles.severityIndicator}>
            <Icon
              name={getSeverityIcon(alert.severity)}
              size={20}
              color={getSeverityColor(alert.severity)}
            />
            <Text
              style={[
                styles.severityText,
                {color: getSeverityColor(alert.severity)},
              ]}>
              {alert.severity.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.alertTitle}>{alert.title}</Text>
        </View>
        {!alert.read && (
          <TouchableOpacity
            style={styles.markReadButton}
            onPress={() => handleMarkAsRead(alert.id)}>
            <Icon name="check" size={16} color="#059669" />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.alertMessage}>{alert.message}</Text>
      
      <View style={styles.alertFooter}>
        <Text style={styles.alertTime}>
          {new Date(alert.timestamp).toLocaleString()}
        </Text>
        {alert.server && (
          <Text style={styles.alertServer}>Server: {alert.server}</Text>
        )}
      </View>
      
      {!alert.read && <View style={styles.unreadIndicator} />}
    </View>
  );

  const filteredAlerts = getFilteredAlerts();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts & Notifications</Text>
        <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
          <Icon name="done-all" size={24} color="#1e3a8a" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            {key: 'all', label: 'All', icon: 'notifications'},
            {key: 'unread', label: 'Unread', icon: 'mark-email-unread'},
            {key: 'critical', label: 'Critical', icon: 'error'},
            {key: 'warning', label: 'Warning', icon: 'warning'},
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, filter === tab.key && styles.activeFilterTab]}
              onPress={() => setFilter(tab.key)}>
              <Icon
                name={tab.icon}
                size={16}
                color={filter === tab.key ? '#ffffff' : '#6b7280'}
              />
              <Text
                style={[
                  styles.filterText,
                  filter === tab.key && styles.activeFilterText,
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Alerts List */}
      <ScrollView
        style={styles.alertsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="notifications-off" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Alerts Found</Text>
            <Text style={styles.emptyMessage}>
              {filter === 'all'
                ? 'No alerts have been generated yet'
                : `No ${filter} alerts found`}
            </Text>
          </View>
        ) : (
          filteredAlerts.map(renderAlertCard)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  markAllButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  activeFilterTab: {
    backgroundColor: '#1e3a8a',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  activeFilterText: {
    color: '#ffffff',
  },
  alertsList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertInfo: {
    flex: 1,
  },
  severityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  markReadButton: {
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
  },
  alertMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  alertServer: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e3a8a',
  },
});

export default Alerts; 