import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  isRead: boolean;
  category: string;
}

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  criticalAlerts: boolean;
  systemMaintenance: boolean;
  performanceAlerts: boolean;
  securityAlerts: boolean;
}

const AlertsNotificationsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>('alerts');
  
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      title: 'High Memory Usage Detected',
      message: 'SAMS-DB-01 server memory usage has exceeded 85% threshold',
      severity: 'warning',
      timestamp: '2025-08-27 10:45:00',
      isRead: false,
      category: 'Performance'
    },
    {
      id: '2',
      title: 'Backup Completed Successfully',
      message: 'Daily database backup completed without errors',
      severity: 'success',
      timestamp: '2025-08-27 09:30:00',
      isRead: true,
      category: 'Maintenance'
    },
    {
      id: '3',
      title: 'Failed Login Attempts Detected',
      message: '15 failed login attempts from IP 192.168.1.100 in the last hour',
      severity: 'error',
      timestamp: '2025-08-27 09:15:00',
      isRead: false,
      category: 'Security'
    },
    {
      id: '4',
      title: 'Scheduled Maintenance Notice',
      message: 'System maintenance scheduled for tonight at 11:00 PM EST',
      severity: 'info',
      timestamp: '2025-08-27 08:00:00',
      isRead: true,
      category: 'Maintenance'
    },
    {
      id: '5',
      title: 'API Response Time Alert',
      message: 'API response times have increased by 25% in the last 30 minutes',
      severity: 'warning',
      timestamp: '2025-08-27 07:45:00',
      isRead: false,
      category: 'Performance'
    }
  ]);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    criticalAlerts: true,
    systemMaintenance: true,
    performanceAlerts: true,
    securityAlerts: true,
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#e74c3c';
      case 'warning': return '#f39c12';
      case 'success': return '#27ae60';
      case 'info': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'check-circle';
      case 'info': return 'info';
      default: return 'help';
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert => ({ ...alert, isRead: true }))
    );
  };

  const updateNotificationSetting = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const unreadCount = alerts.filter(alert => !alert.isRead).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts & Notifications</Text>
        <Text style={styles.subtitle}>
          {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All alerts read'}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>
            Alerts {unreadCount > 0 && <Text style={styles.badge}>({unreadCount})</Text>}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'alerts' ? (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.alertsHeader}>
            <Text style={styles.alertsCount}>{alerts.length} total alerts</Text>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllReadButton} onPress={markAllAsRead}>
                <Text style={styles.markAllReadText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>

          {alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertCard,
                !alert.isRead && styles.unreadAlert
              ]}
              onPress={() => markAsRead(alert.id)}
            >
              <View style={styles.alertHeader}>
                <MaterialIcons
                  name={getSeverityIcon(alert.severity)}
                  size={24}
                  color={getSeverityColor(alert.severity)}
                />
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertTitle, !alert.isRead && styles.unreadText]}>
                    {alert.title}
                  </Text>
                  <Text style={styles.alertCategory}>{alert.category}</Text>
                </View>
                <View style={styles.alertMeta}>
                  {!alert.isRead && <View style={styles.unreadDot} />}
                  <Text style={styles.alertTimestamp}>{alert.timestamp}</Text>
                </View>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Notification Methods</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="notifications" size={24} color="#4a90e2" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive notifications on this device
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.pushNotifications}
                onValueChange={(value) => updateNotificationSetting('pushNotifications', value)}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="email" size={24} color="#4a90e2" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Email Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Send alerts to your registered email
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.emailNotifications}
                onValueChange={(value) => updateNotificationSetting('emailNotifications', value)}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="sms" size={24} color="#4a90e2" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>SMS Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Send critical alerts via SMS
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.smsNotifications}
                onValueChange={(value) => updateNotificationSetting('smsNotifications', value)}
              />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Alert Types</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="priority-high" size={24} color="#e74c3c" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Critical Alerts</Text>
                  <Text style={styles.settingDescription}>
                    System failures and critical issues
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.criticalAlerts}
                onValueChange={(value) => updateNotificationSetting('criticalAlerts', value)}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="build" size={24} color="#f39c12" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>System Maintenance</Text>
                  <Text style={styles.settingDescription}>
                    Scheduled maintenance and updates
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.systemMaintenance}
                onValueChange={(value) => updateNotificationSetting('systemMaintenance', value)}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="speed" size={24} color="#9b59b6" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Performance Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Performance degradation warnings
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.performanceAlerts}
                onValueChange={(value) => updateNotificationSetting('performanceAlerts', value)}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="security" size={24} color="#27ae60" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Security Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Security incidents and breaches
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.securityAlerts}
                onValueChange={(value) => updateNotificationSetting('securityAlerts', value)}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4a90e2',
  },
  tabText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  badge: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  alertsCount: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  markAllReadButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  markAllReadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertInfo: {
    flex: 1,
    marginLeft: 15,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  unreadText: {
    color: '#2c3e50',
  },
  alertCategory: {
    fontSize: 12,
    color: '#7f8c8d',
    textTransform: 'uppercase',
  },
  alertMeta: {
    alignItems: 'flex-end',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4a90e2',
    marginBottom: 5,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#95a5a6',
  },
  alertMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  settingsSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});

export default AlertsNotificationsScreen;
