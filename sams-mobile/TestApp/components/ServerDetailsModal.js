/**
 * 🔍 Server Details Modal Component
 * Real server details with functional log viewing and service management
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList
} from 'react-native';
import ServerDetailsManager from '../services/serverDetailsManager';

const ServerDetailsModal = ({ visible, onClose, server, theme }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [serverDetails, setServerDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState(null);
  const [selectedLogType, setSelectedLogType] = useState('system');

  useEffect(() => {
    if (visible && server) {
      loadServerDetails();
    }
  }, [visible, server]);

  const loadServerDetails = async () => {
    if (!server) return;
    
    setLoading(true);
    try {
      const details = await ServerDetailsManager.getServerDetails(server);
      setServerDetails(details);
    } catch (error) {
      Alert.alert('❌ Error', `Failed to load server details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshDetails = async () => {
    setRefreshing(true);
    try {
      await loadServerDetails();
      if (activeTab === 'logs') {
        await loadLogs(selectedLogType);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const loadLogs = async (logType) => {
    if (!server) return;
    
    setLoading(true);
    try {
      const logData = await ServerDetailsManager.getServerLogs(server, logType);
      setLogs(logData);
      setSelectedLogType(logType);
    } catch (error) {
      Alert.alert('❌ Error', `Failed to load ${logType} logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAction = async (serviceName, action) => {
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Service`,
      `Are you sure you want to ${action} the ${serviceName} service on ${server.name}?\n\nThis will make real changes to the server.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: action === 'stop' ? 'destructive' : 'default',
          onPress: async () => {
            setLoading(true);
            try {
              let result;
              switch (action) {
                case 'start':
                  result = await ServerDetailsManager.startService(server, serviceName);
                  break;
                case 'stop':
                  result = await ServerDetailsManager.stopService(server, serviceName);
                  break;
                case 'restart':
                  result = await ServerDetailsManager.restartService(server, serviceName);
                  break;
              }
              
              if (result.success) {
                Alert.alert('✅ Success', result.message);
                await refreshDetails(); // Refresh to show updated service status
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

  const renderTabButton = (tabId, title, icon) => (
    <TouchableOpacity
      key={tabId}
      style={[
        styles.tabButton,
        activeTab === tabId && styles.activeTabButton,
        { backgroundColor: activeTab === tabId ? theme.primary : 'transparent' }
      ]}
      onPress={() => {
        setActiveTab(tabId);
        if (tabId === 'logs' && !logs) {
          loadLogs(selectedLogType);
        }
      }}
    >
      <Text style={[
        styles.tabButtonText,
        { color: activeTab === tabId ? '#FFFFFF' : theme.text }
      ]}>
        {icon} {title}
      </Text>
    </TouchableOpacity>
  );

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {serverDetails && (
        <>
          {/* System Information */}
          <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>🖥️ System Information</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>OS:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {serverDetails.systemInfo.os || 'Windows Server'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Version:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {serverDetails.systemInfo.version || 'Unknown'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Uptime:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatUptime(serverDetails.systemInfo.uptime || 0)}
              </Text>
            </View>
          </View>

          {/* Hardware Information */}
          <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>⚙️ Hardware</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>CPU:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {serverDetails.hardware.cpu || 'Unknown CPU'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>RAM:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatBytes(serverDetails.hardware.totalMemory || 0)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Storage:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatBytes(serverDetails.hardware.totalStorage || 0)}
              </Text>
            </View>
          </View>

          {/* Network Information */}
          <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>🌐 Network</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>IP Address:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {server.ip}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Hostname:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {serverDetails.network.hostname || server.name}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Domain:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {serverDetails.network.domain || 'WORKGROUP'}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderServicesTab = () => (
    <ScrollView style={styles.tabContent}>
      {serverDetails?.services?.map((service, index) => (
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
              { backgroundColor: service.status === 'Running' ? '#10B981' : '#EF4444' }
            ]}>
              <Text style={styles.serviceStatusText}>
                {service.status || 'Unknown'}
              </Text>
            </View>
          </View>
          
          <View style={styles.serviceActions}>
            <TouchableOpacity
              style={[styles.serviceButton, styles.startButton]}
              onPress={() => handleServiceAction(service.name, 'start')}
              disabled={loading}
            >
              <Text style={styles.serviceButtonText}>▶️ Start</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.serviceButton, styles.stopButton]}
              onPress={() => handleServiceAction(service.name, 'stop')}
              disabled={loading}
            >
              <Text style={styles.serviceButtonText}>⏹️ Stop</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.serviceButton, styles.restartButton]}
              onPress={() => handleServiceAction(service.name, 'restart')}
              disabled={loading}
            >
              <Text style={styles.serviceButtonText}>🔄 Restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderLogsTab = () => (
    <View style={styles.tabContent}>
      {/* Log Type Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.logTypeSelector}>
        {ServerDetailsManager.getAvailableLogTypes().map((logType) => (
          <TouchableOpacity
            key={logType.id}
            style={[
              styles.logTypeButton,
              selectedLogType === logType.id && styles.activeLogTypeButton,
              { backgroundColor: selectedLogType === logType.id ? theme.primary : theme.surface }
            ]}
            onPress={() => loadLogs(logType.id)}
          >
            <Text style={[
              styles.logTypeButtonText,
              { color: selectedLogType === logType.id ? '#FFFFFF' : theme.text }
            ]}>
              {logType.icon} {logType.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Log Content */}
      {logs && (
        <View style={[styles.logContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.logHeader}>
            <Text style={[styles.logTitle, { color: theme.text }]}>
              📄 {logs.logType.charAt(0).toUpperCase() + logs.logType.slice(1)} Logs
            </Text>
            <Text style={[styles.logInfo, { color: theme.textSecondary }]}>
              {logs.totalLines} lines • {formatBytes(logs.size)} • {logs.filePath}
            </Text>
          </View>
          
          <FlatList
            data={logs.entries}
            keyExtractor={(item, index) => index.toString()}
            style={styles.logList}
            renderItem={({ item }) => (
              <View style={styles.logEntry}>
                <Text style={[styles.logTimestamp, { color: theme.textSecondary }]}>
                  {item.timestamp || 'No timestamp'}
                </Text>
                <Text style={[styles.logLevel, { 
                  color: getLogLevelColor(item.level || 'INFO') 
                }]}>
                  [{item.level || 'INFO'}]
                </Text>
                <Text style={[styles.logMessage, { color: theme.text }]}>
                  {item.message || 'No message'}
                </Text>
              </View>
            )}
            ItemSeparatorComponent={() => (
              <View style={[styles.logSeparator, { backgroundColor: theme.border }]} />
            )}
          />
        </View>
      )}
    </View>
  );

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLogLevelColor = (level) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return '#EF4444';
      case 'WARN': case 'WARNING': return '#F59E0B';
      case 'INFO': return '#3B82F6';
      case 'DEBUG': return '#6B7280';
      default: return '#374151';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            🔍 Server Details
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {server?.name} ({server?.ip})
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabNavigation}>
          {renderTabButton('overview', 'Overview', '📊')}
          {renderTabButton('services', 'Services', '⚙️')}
          {renderTabButton('logs', 'Logs', '📄')}
          {renderTabButton('performance', 'Performance', '📈')}
        </ScrollView>

        {/* Content */}
        <View style={styles.content}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                Loading server details...
              </Text>
            </View>
          )}

          {!loading && (
            <ScrollView
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refreshDetails}
                  tintColor={theme.primary}
                />
              }
            >
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'services' && renderServicesTab()}
              {activeTab === 'logs' && renderLogsTab()}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 50,
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
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabNavigation: {
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
    flex: 1,
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
  detailCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
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
  logTypeSelector: {
    marginBottom: 16,
  },
  logTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeLogTypeButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  logInfo: {
    fontSize: 12,
  },
  logList: {
    flex: 1,
    maxHeight: 400,
  },
  logEntry: {
    paddingVertical: 8,
  },
  logTimestamp: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  logSeparator: {
    height: 1,
    marginVertical: 4,
  },
});

export default ServerDetailsModal;
