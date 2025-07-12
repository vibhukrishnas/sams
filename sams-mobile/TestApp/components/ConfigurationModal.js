/**
 * ⚙️ Configuration Modal Component
 * Real server configuration with actual changes and file-based settings
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
  Animated,
  TextInput
} from 'react-native';
import ConfigurationManager from '../services/configurationManager';

const ConfigurationModal = ({ visible, onClose, server, theme }) => {
  const [activeTab, setActiveTab] = useState('performance');
  const [configStatus, setConfigStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [customSettings, setCustomSettings] = useState('');

  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible && server) {
      loadConfigurationStatus();
      setupNotificationListener();
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, server]);

  const loadConfigurationStatus = () => {
    if (!server) return;
    
    const status = ConfigurationManager.getConfigurationStatus(server.id);
    setConfigStatus(status);
  };

  const setupNotificationListener = () => {
    const unsubscribe = ConfigurationManager.addNotificationListener((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== notification));
      }, 5000);
    });

    return unsubscribe;
  };

  const applyPerformanceTuning = async (tuningType) => {
    if (!server) return;
    
    Alert.alert(
      '🔧 Apply Performance Tuning',
      `This will apply ${tuningType} performance tuning to ${server.name}.\n\nThis will make REAL changes to the server including:\n• CPU scheduling optimization\n• Memory management settings\n• Disk I/O optimization\n• Process priority adjustments\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            
            try {
              const result = await ConfigurationManager.applyPerformanceTuning(server, tuningType);
              
              if (result.success) {
                Alert.alert(
                  '✅ Performance Tuning Applied',
                  `${tuningType} performance tuning applied successfully!\n\nChanges made:\n${result.changes?.join('\n') || 'Performance optimized'}`,
                  [{ text: 'OK', onPress: loadConfigurationStatus }]
                );
              } else {
                Alert.alert('❌ Configuration Failed', result.error || 'Unknown error occurred');
              }
            } catch (error) {
              Alert.alert('❌ Error', `Failed to apply performance tuning: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const applyNetworkConfiguration = async (networkType) => {
    if (!server) return;
    
    Alert.alert(
      '🌐 Apply Network Configuration',
      `This will apply ${networkType} network configuration to ${server.name}.\n\nThis will make REAL changes including:\n• Network adapter settings\n• TCP/IP configuration\n• Firewall rules\n• DNS settings\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setLoading(true);
            
            try {
              const result = await ConfigurationManager.applyNetworkConfiguration(server, networkType);
              
              if (result.success) {
                Alert.alert(
                  '✅ Network Configuration Applied',
                  `${networkType} network configuration applied successfully!\n\nChanges made:\n${result.changes?.join('\n') || 'Network configured'}`,
                  [{ text: 'OK', onPress: loadConfigurationStatus }]
                );
              } else {
                Alert.alert('❌ Configuration Failed', result.error || 'Unknown error occurred');
              }
            } catch (error) {
              Alert.alert('❌ Error', `Failed to apply network configuration: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const applyBackupMaintenance = async (backupType) => {
    if (!server) return;
    
    Alert.alert(
      '💾 Apply Backup & Maintenance',
      `This will configure ${backupType} backup and maintenance on ${server.name}.\n\nThis will make REAL changes including:\n• Backup schedules\n• Maintenance windows\n• Cleanup policies\n• Storage locations\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setLoading(true);
            
            try {
              const result = await ConfigurationManager.applyBackupMaintenance(server, backupType);
              
              if (result.success) {
                Alert.alert(
                  '✅ Backup & Maintenance Configured',
                  `${backupType} backup and maintenance configured successfully!\n\nChanges made:\n${result.changes?.join('\n') || 'Backup configured'}`,
                  [{ text: 'OK', onPress: loadConfigurationStatus }]
                );
              } else {
                Alert.alert('❌ Configuration Failed', result.error || 'Unknown error occurred');
              }
            } catch (error) {
              Alert.alert('❌ Error', `Failed to configure backup: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const createConfigurationFile = async () => {
    if (!server || !customSettings.trim()) {
      Alert.alert('❌ Error', 'Please enter configuration settings');
      return;
    }
    
    setLoading(true);
    
    try {
      let settings;
      try {
        settings = JSON.parse(customSettings);
      } catch (e) {
        // If not JSON, treat as plain text
        settings = { content: customSettings };
      }
      
      const result = await ConfigurationManager.createConfigurationFile(server, 'custom', settings);
      
      if (result.success) {
        Alert.alert(
          '✅ Configuration File Created',
          `Configuration file created successfully!\n\nFile: ${result.filename}\nPath: ${result.path}\nSize: ${result.size} bytes`,
          [{ text: 'OK' }]
        );
        setCustomSettings('');
      }
    } catch (error) {
      Alert.alert('❌ Error', `Failed to create configuration file: ${error.message}`);
    } finally {
      setLoading(false);
    }
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

  const renderPerformanceTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>🔧 Performance Tuning</Text>
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
          Apply real performance optimizations to the server. These changes will modify actual system settings.
        </Text>
        
        <TouchableOpacity
          style={[styles.configButton, styles.highPerformanceButton]}
          onPress={() => applyPerformanceTuning('high-performance')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>🚀 HIGH PERFORMANCE</Text>
          <Text style={styles.configButtonDescription}>
            Maximum performance, high resource usage
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.configButton, styles.balancedButton]}
          onPress={() => applyPerformanceTuning('balanced')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>⚖️ BALANCED</Text>
          <Text style={styles.configButtonDescription}>
            Optimal balance of performance and efficiency
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.configButton, styles.powerSaverButton]}
          onPress={() => applyPerformanceTuning('power-saver')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>🔋 POWER SAVER</Text>
          <Text style={styles.configButtonDescription}>
            Reduced performance, minimal resource usage
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Performance Status */}
      {configStatus?.performance && (
        <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Current Performance Status</Text>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            Status: {configStatus.performance.status || 'Not configured'}
          </Text>
          {configStatus.performance.type && (
            <Text style={[styles.statusText, { color: theme.text }]}>
              Type: {configStatus.performance.type}
            </Text>
          )}
          {configStatus.performance.appliedAt && (
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              Applied: {new Date(configStatus.performance.appliedAt).toLocaleString()}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderNetworkTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>🌐 Network Configuration</Text>
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
          Configure network settings and optimize connectivity. These changes affect actual network configuration.
        </Text>
        
        <TouchableOpacity
          style={[styles.configButton, styles.enterpriseNetworkButton]}
          onPress={() => applyNetworkConfiguration('enterprise')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>🏢 ENTERPRISE NETWORK</Text>
          <Text style={styles.configButtonDescription}>
            Enterprise-grade security and performance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.configButton, styles.standardNetworkButton]}
          onPress={() => applyNetworkConfiguration('standard')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>🌐 STANDARD NETWORK</Text>
          <Text style={styles.configButtonDescription}>
            Standard network configuration
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.configButton, styles.optimizedNetworkButton]}
          onPress={() => applyNetworkConfiguration('optimized')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>⚡ OPTIMIZED NETWORK</Text>
          <Text style={styles.configButtonDescription}>
            Performance-optimized network settings
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBackupTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>💾 Backup & Maintenance</Text>
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
          Configure backup schedules and maintenance windows. These settings create actual backup jobs.
        </Text>
        
        <TouchableOpacity
          style={[styles.configButton, styles.dailyBackupButton]}
          onPress={() => applyBackupMaintenance('daily')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>📅 DAILY BACKUP</Text>
          <Text style={styles.configButtonDescription}>
            Daily automated backups with retention
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.configButton, styles.weeklyBackupButton]}
          onPress={() => applyBackupMaintenance('weekly')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>📆 WEEKLY BACKUP</Text>
          <Text style={styles.configButtonDescription}>
            Weekly full system backups
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.configButton, styles.customBackupButton]}
          onPress={() => applyBackupMaintenance('custom')}
          disabled={loading}
        >
          <Text style={styles.configButtonText}>⚙️ CUSTOM SCHEDULE</Text>
          <Text style={styles.configButtonDescription}>
            Custom backup and maintenance schedule
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderFilesTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>📂 Configuration Files</Text>
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
          Create and manage configuration files on the server. Files are created in the server's configuration directory.
        </Text>
        
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: theme.background, 
            color: theme.text,
            borderColor: theme.border 
          }]}
          placeholder="Enter configuration settings (JSON or plain text)"
          placeholderTextColor={theme.textSecondary}
          value={customSettings}
          onChangeText={setCustomSettings}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />
        
        <TouchableOpacity
          style={[styles.configButton, styles.createFileButton]}
          onPress={createConfigurationFile}
          disabled={loading || !customSettings.trim()}
        >
          <Text style={styles.configButtonText}>📂 CREATE CONFIG FILE</Text>
          <Text style={styles.configButtonDescription}>
            Create configuration file on server
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

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
            ⚙️ Server Configuration
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {server?.name} ({server?.ip})
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        {notifications.length > 0 && (
          <View style={styles.notificationsContainer}>
            {notifications.map((notification, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.notification,
                  {
                    backgroundColor: notification.type === 'error' ? '#FEE2E2' : 
                                   notification.type === 'success' ? '#D1FAE5' : '#FEF3C7',
                    opacity: fadeAnim
                  }
                ]}
              >
                <Text style={[
                  styles.notificationText,
                  {
                    color: notification.type === 'error' ? '#DC2626' :
                           notification.type === 'success' ? '#059669' : '#D97706'
                  }
                ]}>
                  {notification.message}
                </Text>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Tab Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabNavigation}>
          {renderTabButton('performance', 'Performance', '🔧')}
          {renderTabButton('network', 'Network', '🌐')}
          {renderTabButton('backup', 'Backup', '💾')}
          {renderTabButton('files', 'Files', '📂')}
        </ScrollView>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'performance' && renderPerformanceTab()}
          {activeTab === 'network' && renderNetworkTab()}
          {activeTab === 'backup' && renderBackupTab()}
          {activeTab === 'files' && renderFilesTab()}
        </View>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Applying configuration...</Text>
            </View>
          </View>
        )}
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
  card: {
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
  cardDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  configButton: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  highPerformanceButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  balancedButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  powerSaverButton: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  enterpriseNetworkButton: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  standardNetworkButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  optimizedNetworkButton: {
    backgroundColor: '#FDF4FF',
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  dailyBackupButton: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  weeklyBackupButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  customBackupButton: {
    backgroundColor: '#FEF7FF',
    borderWidth: 1,
    borderColor: '#C084FC',
  },
  createFileButton: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  configButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  configButtonDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});

export default ConfigurationModal;
