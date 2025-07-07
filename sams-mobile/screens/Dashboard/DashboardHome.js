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
import {useAuth} from '../../sams-mobile/context/AuthContext';
import {getServerList, getAlerts} from '../../utils/storage';

const DashboardHome = ({navigation}) => {
  const {user} = useAuth();
  const [servers, setServers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [serverList, alertList] = await Promise.all([
        getServerList(),
        getAlerts(),
      ]);
      setServers(serverList);
      setAlerts(alertList);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getServerStatus = () => {
    const total = servers.length;
    const online = servers.filter(server => server.status === 'online').length;
    const offline = servers.filter(server => server.status === 'offline').length;
    const warning = servers.filter(server => server.status === 'warning').length;

    return {total, online, offline, warning};
  };

  const getAlertStats = () => {
    const total = alerts.length;
    const unread = alerts.filter(alert => !alert.read).length;
    const critical = alerts.filter(alert => alert.severity === 'critical').length;
    const warning = alerts.filter(alert => alert.severity === 'warning').length;

    return {total, unread, critical, warning};
  };

  const serverStatus = getServerStatus();
  const alertStats = getAlertStats();

  const quickActions = [
    {
      title: 'Add Server',
      icon: 'add-circle',
      color: '#059669',
      onPress: () => navigation.navigate('ServerManagement'),
    },
    {
      title: 'Execute Command',
      icon: 'terminal',
      color: '#7c3aed',
      onPress: () => navigation.navigate('ExecuteCommands'),
    },
    {
      title: 'View Reports',
      icon: 'assessment',
      color: '#ea580c',
      onPress: () => navigation.navigate('Reports'),
    },
    {
      title: 'Alerts',
      icon: 'notifications-active',
      color: '#be185d',
      onPress: () => navigation.navigate('Alerts'),
    },
  ];

  const renderStatCard = (title, value, subtitle, color, icon) => (
    <View style={[styles.statCard, {borderLeftColor: color}]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderQuickAction = (action) => (
    <TouchableOpacity
      key={action.title}
      style={styles.quickActionCard}
      onPress={action.onPress}>
      <View style={[styles.actionIcon, {backgroundColor: action.color}]}>
        <Icon name={action.icon} size={24} color="#ffffff" />
      </View>
      <Text style={styles.actionTitle}>{action.title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Administrator'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Alerts')}>
            <Icon name="notifications" size={24} color="#1e3a8a" />
            {alertStats.unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alertStats.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Server Status Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Status</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Servers',
            serverStatus.total,
            'Monitored servers',
            '#1e3a8a',
            'dns',
          )}
          {renderStatCard(
            'Online',
            serverStatus.online,
            'Healthy servers',
            '#059669',
            'check-circle',
          )}
          {renderStatCard(
            'Offline',
            serverStatus.offline,
            'Down servers',
            '#dc2626',
            'error',
          )}
          {renderStatCard(
            'Warning',
            serverStatus.warning,
            'Issues detected',
            '#ea580c',
            'warning',
          )}
        </View>
      </View>

      {/* Alert Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Overview</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Alerts',
            alertStats.total,
            'All alerts',
            '#1e3a8a',
            'notifications',
          )}
          {renderStatCard(
            'Unread',
            alertStats.unread,
            'New alerts',
            '#be185d',
            'mark-email-unread',
          )}
          {renderStatCard(
            'Critical',
            alertStats.critical,
            'High priority',
            '#dc2626',
            'priority-high',
          )}
          {renderStatCard(
            'Warning',
            alertStats.warning,
            'Medium priority',
            '#ea580c',
            'warning',
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map(renderQuickAction)}
        </View>
      </View>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {alerts.slice(0, 3).map((alert, index) => (
            <View key={alert.id || index} style={styles.alertItem}>
              <View style={styles.alertIcon}>
                <Icon
                  name={
                    alert.severity === 'critical'
                      ? 'error'
                      : alert.severity === 'warning'
                      ? 'warning'
                      : 'info'
                  }
                  size={20}
                  color={
                    alert.severity === 'critical'
                      ? '#dc2626'
                      : alert.severity === 'warning'
                      ? '#ea580c'
                      : '#1e3a8a'
                  }
                />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>{alert.timestamp}</Text>
              </View>
              {!alert.read && <View style={styles.unreadDot} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  welcomeText: {
    fontSize: 16,
    color: '#6b7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    margin: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#1e3a8a',
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e3a8a',
  },
});

export default DashboardHome; 