/**
 * ⚙️ Services and Processes Component
 * Real-time services and processes management with valiant features
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch
} from 'react-native';
import ServicesProcessesManager from '../services/servicesProcessesManager';

const ServicesProcessesComponent = ({ theme, server, visible }) => {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [serviceStats, setServiceStats] = useState({});
  const [processStats, setProcessStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeMonitoring, setRealTimeMonitoring] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (visible && server) {
      loadData();
      setupNotificationListener();
    }
    
    return () => {
      if (server) {
        ServicesProcessesManager.stopServiceMonitoring(server.id);
      }
    };
  }, [visible, server]);

  const setupNotificationListener = () => {
    const unsubscribe = ServicesProcessesManager.addNotificationListener((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== notification));
      }, 5000);
      
      // Refresh data on certain notifications
      if (['service-action', 'process-killed'].includes(notification.type)) {
        loadData();
      }
    });

    return unsubscribe;
  };

  const loadData = async () => {
    if (!server) return;
    
    setLoading(true);
    
    try {
      await ServicesProcessesManager.refreshServices(server);
      await ServicesProcessesManager.refreshProcesses(server);
      
      updateLocalData();
    } catch (error) {
      Alert.alert('❌ Error', `Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateLocalData = () => {
    if (!server) return;
    
    const serverServices = ServicesProcessesManager.getServices(server.id);
    const serverProcesses = ServicesProcessesManager.getProcesses(server.id);
    const servStats = ServicesProcessesManager.getServiceStatistics(server.id);
    const procStats = ServicesProcessesManager.getProcessStatistics(server.id);
    
    setServices(serverServices);
    setProcesses(serverProcesses);
    setServiceStats(servStats);
    setProcessStats(procStats);
  };

  const toggleRealTimeMonitoring = async () => {
    if (!server) return;
    
    try {
      if (realTimeMonitoring) {
        ServicesProcessesManager.stopServiceMonitoring(server.id);
        setRealTimeMonitoring(false);
        
        Alert.alert(
          '🛑 Monitoring Stopped',
          'Real-time monitoring has been stopped.',
          [{ text: 'OK' }]
        );
      } else {
        await ServicesProcessesManager.startServiceMonitoring(server, 15000); // 15 seconds
        setRealTimeMonitoring(true);
        
        Alert.alert(
          '🔄 Monitoring Started',
          'Real-time monitoring is now active.\n\nServices and processes will be updated every 15 seconds.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('❌ Error', `Failed to toggle monitoring: ${error.message}`);
    }
  };

  const handleServiceAction = async (service, action) => {
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Service`,
      `Are you sure you want to ${action} the ${service.name} service?\n\nThis will make real changes to the server.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: action === 'stop' ? 'destructive' : 'default',
          onPress: async () => {
            setLoading(true);
            
            try {
              const result = await ServicesProcessesManager.controlService(server, service.name, action);
              
              if (result.success) {
                Alert.alert(
                  '✅ Success',
                  `Service ${service.name} ${action} completed successfully!`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert('❌ Error', `Failed to ${action} service: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleKillProcess = async (process) => {
    Alert.alert(
      '🔄 Kill Process',
      `Are you sure you want to kill the process "${process.name}"?\n\nPID: ${process.pid}\nCPU: ${process.cpu}%\nMemory: ${ServicesProcessesManager.formatBytes(process.memory)}\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🔄 Kill Process',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            
            try {
              const result = await ServicesProcessesManager.killProcess(server, process.pid, process.name);
              
              if (result.success) {
                Alert.alert(
                  '✅ Process Killed',
                  `Process ${process.name} has been terminated successfully!`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert('❌ Error', `Failed to kill process: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderTabButton = (tabId, title, icon) => (
    <TouchableOpacity
      key={tabId}
      style={[
        styles.tabButton,
        activeTab === tabId && styles.activeTabButton,
        { backgroundColor: activeTab === tabId ? theme.primary : 'transparent' }
      ]}
      onPress={() => setActiveTab(tabId)}
    >
      <Text style={[
        styles.tabButtonText,
        { color: activeTab === tabId ? '#FFFFFF' : theme.text }
      ]}>
        {icon} {title}
      </Text>
    </TouchableOpacity>
  );

  const renderServicesTab = () => (
    <View style={styles.tabContent}>
      {/* Service Statistics */}
      <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.statsTitle, { color: theme.text }]}>⚙️ Service Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.text }]}>{serviceStats.total || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{serviceStats.running || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Running</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{serviceStats.stopped || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Stopped</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{serviceStats.error || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Error</Text>
          </View>
        </View>
      </View>

      {/* Services List */}
      {services.map((service, index) => (
        <View key={index} style={[styles.serviceCard, { backgroundColor: theme.surface }]}>
          <View style={styles.serviceHeader}>
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceName, { color: theme.text }]}>
                {service.name || 'Unknown Service'}
              </Text>
              <Text style={[styles.serviceDescription, { color: theme.textSecondary }]}>
                {service.description || 'No description available'}
              </Text>
            </View>
            <View style={[
              styles.serviceStatus,
              { backgroundColor: getServiceStatusColor(service.status) }
            ]}>
              <Text style={styles.serviceStatusText}>
                {service.status || 'Unknown'}
              </Text>
            </View>
          </View>
          
          <View style={styles.serviceActions}>
            <TouchableOpacity
              style={[styles.serviceButton, styles.startButton]}
              onPress={() => handleServiceAction(service, 'start')}
              disabled={loading}
            >
              <Text style={styles.serviceButtonText}>▶️ Start</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.serviceButton, styles.stopButton]}
              onPress={() => handleServiceAction(service, 'stop')}
              disabled={loading}
            >
              <Text style={styles.serviceButtonText}>⏹️ Stop</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.serviceButton, styles.restartButton]}
              onPress={() => handleServiceAction(service, 'restart')}
              disabled={loading}
            >
              <Text style={styles.serviceButtonText}>🔄 Restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderProcessesTab = () => (
    <View style={styles.tabContent}>
      {/* Process Statistics */}
      <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.statsTitle, { color: theme.text }]}>🔄 Process Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.text }]}>{processStats.total || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{Math.round(processStats.totalCpu) || 0}%</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>CPU</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>{ServicesProcessesManager.formatBytes(processStats.totalMemory || 0)}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Memory</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{processStats.highCpuCount || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>High CPU</Text>
          </View>
        </View>
      </View>

      {/* Processes List */}
      {processes.slice(0, 20).map((process, index) => (
        <View key={index} style={[styles.processCard, { backgroundColor: theme.surface }]}>
          <View style={styles.processHeader}>
            <View style={styles.processInfo}>
              <Text style={[styles.processName, { color: theme.text }]}>
                {process.name || 'Unknown Process'}
              </Text>
              <Text style={[styles.processDetails, { color: theme.textSecondary }]}>
                PID: {process.pid} • CPU: {process.cpu}% • Memory: {ServicesProcessesManager.formatBytes(process.memory || 0)}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.killButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleKillProcess(process)}
              disabled={loading}
            >
              <Text style={styles.killButtonText}>🔄 Kill</Text>
            </TouchableOpacity>
          </View>
          
          {/* Resource Usage Bars */}
          <View style={styles.resourceBars}>
            <View style={styles.resourceBar}>
              <Text style={[styles.resourceLabel, { color: theme.textSecondary }]}>CPU</Text>
              <View style={[styles.progressBar, { backgroundColor: theme.background }]}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${Math.min(process.cpu || 0, 100)}%`,
                    backgroundColor: process.cpu > 80 ? '#EF4444' : process.cpu > 50 ? '#F59E0B' : '#10B981'
                  }
                ]} />
              </View>
              <Text style={[styles.resourceValue, { color: theme.text }]}>{process.cpu}%</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const getServiceStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'started':
        return '#10B981';
      case 'stopped':
      case 'disabled':
        return '#EF4444';
      case 'error':
      case 'failed':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          ⚙️ Services & Processes
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {server?.name} ({server?.ip})
        </Text>
      </View>

      {/* Real-time Monitoring Toggle */}
      <View style={[styles.monitoringToggle, { backgroundColor: theme.surface }]}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            🔄 Real-time Monitoring
          </Text>
          <Text style={[styles.toggleDescription, { color: theme.textSecondary }]}>
            Auto-refresh every 15 seconds
          </Text>
        </View>
        <Switch
          value={realTimeMonitoring}
          onValueChange={toggleRealTimeMonitoring}
          trackColor={{ false: '#767577', true: theme.primary }}
          thumbColor={realTimeMonitoring ? '#FFFFFF' : '#F4F3F4'}
        />
      </View>

      {/* Notifications */}
      {notifications.length > 0 && (
        <View style={styles.notificationsContainer}>
          {notifications.map((notification, index) => (
            <View
              key={index}
              style={[
                styles.notification,
                {
                  backgroundColor: notification.type === 'error' ? '#FEE2E2' : 
                                 notification.severity === 'warning' ? '#FEF3C7' : '#D1FAE5'
                }
              ]}
            >
              <Text style={[
                styles.notificationText,
                {
                  color: notification.type === 'error' ? '#DC2626' :
                         notification.severity === 'warning' ? '#D97706' : '#059669'
                }
              ]}>
                {notification.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {renderTabButton('services', 'Services', '⚙️')}
        {renderTabButton('processes', 'Processes', '🔄')}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading {activeTab}...
            </Text>
          </View>
        )}

        {!loading && (
          <>
            {activeTab === 'services' && renderServicesTab()}
            {activeTab === 'processes' && renderProcessesTab()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  monitoringToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
  },
  notificationsContainer: {
    padding: 16,
  },
  notification: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeTabButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  serviceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  serviceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  serviceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  serviceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  restartButton: {
    backgroundColor: '#F59E0B',
  },
  serviceButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  processCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  processHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  processInfo: {
    flex: 1,
    marginRight: 12,
  },
  processName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  processDetails: {
    fontSize: 12,
    lineHeight: 16,
  },
  killButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  killButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resourceBars: {
    gap: 8,
  },
  resourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourceLabel: {
    fontSize: 12,
    fontWeight: '500',
    width: 40,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  resourceValue: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
});

export default ServicesProcessesComponent;
