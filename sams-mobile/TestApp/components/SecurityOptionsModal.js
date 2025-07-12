/**
 * 🔒 Security Options Modal Component
 * Real security configuration with actual server changes
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
  Switch,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import SecurityManager from '../services/securityManager';

const SecurityOptionsModal = ({ visible, onClose, server, theme }) => {
  const [securityStatus, setSecurityStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [securityFeatures, setSecurityFeatures] = useState({
    firewall: false,
    antivirus: false,
    windowsDefender: false,
    automaticUpdates: false,
    uac: false,
    remoteDesktop: false
  });

  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible && server) {
      loadSecurityStatus();
      setupNotificationListener();
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, server]);

  const loadSecurityStatus = () => {
    if (!server) return;
    
    const status = SecurityManager.getSecurityStatus(server.id);
    setSecurityStatus(status);
    
    // Load current feature states (in real implementation, this would come from server)
    setSecurityFeatures({
      firewall: status.features?.firewall?.enabled || false,
      antivirus: status.features?.antivirus?.enabled || false,
      windowsDefender: status.features?.windowsDefender?.enabled || false,
      automaticUpdates: status.features?.automaticUpdates?.enabled || false,
      uac: status.features?.uac?.enabled || false,
      remoteDesktop: status.features?.remoteDesktop?.enabled || false
    });
  };

  const setupNotificationListener = () => {
    const unsubscribe = SecurityManager.addNotificationListener((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== notification));
      }, 5000);
    });

    return unsubscribe;
  };

  const applySecurityLevel = async (level) => {
    if (!server) return;
    
    Alert.alert(
      '🔒 Apply Security Configuration',
      `This will apply ${level} security settings to ${server.name}.\n\nThis will make REAL changes to the server including:\n• Firewall settings\n• Windows Defender\n• User Account Control\n• Automatic Updates\n• Remote Desktop settings\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            
            try {
              const result = await SecurityManager.applySecurityConfiguration(server, level);
              
              if (result.success) {
                Alert.alert(
                  '✅ Security Applied',
                  `${level} security configuration applied successfully!\n\nChanges made:\n${result.changes?.join('\n') || 'Configuration updated'}`,
                  [{ text: 'OK', onPress: loadSecurityStatus }]
                );
              } else {
                Alert.alert('❌ Configuration Failed', result.error || 'Unknown error occurred');
              }
            } catch (error) {
              Alert.alert('❌ Error', `Failed to apply security: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const toggleSecurityFeature = async (feature, enabled) => {
    if (!server) return;
    
    setLoading(true);
    
    try {
      const result = await SecurityManager.toggleSecurityFeature(server, feature, enabled);
      
      if (result.success) {
        setSecurityFeatures(prev => ({
          ...prev,
          [feature]: enabled
        }));
        
        // Show success feedback
        Alert.alert(
          '✅ Feature Updated',
          `${feature} has been ${enabled ? 'enabled' : 'disabled'} on ${server.name}\n\nChanges:\n${result.changes?.join('\n') || 'Feature toggled successfully'}`
        );
      } else {
        Alert.alert('❌ Toggle Failed', result.error || 'Failed to toggle feature');
        
        // Revert the toggle
        setSecurityFeatures(prev => ({
          ...prev,
          [feature]: !enabled
        }));
      }
    } catch (error) {
      Alert.alert('❌ Error', `Failed to toggle ${feature}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityLevelColor = (level) => {
    switch (level) {
      case 'high': return '#EF4444';
      case 'standard': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getSecurityLevelIcon = (level) => {
    switch (level) {
      case 'high': return '🔴';
      case 'standard': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
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
            🔒 Security Configuration
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

        <ScrollView style={styles.content}>
          {/* Current Security Status */}
          {securityStatus && (
            <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Current Security Status</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusIcon}>
                  {getSecurityLevelIcon(securityStatus.level)}
                </Text>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLevel, { color: getSecurityLevelColor(securityStatus.level) }]}>
                    {securityStatus.level.toUpperCase()} SECURITY
                  </Text>
                  <Text style={[styles.statusDate, { color: theme.textSecondary }]}>
                    {securityStatus.lastUpdated ? 
                      `Updated: ${new Date(securityStatus.lastUpdated).toLocaleString()}` : 
                      'Not configured'
                    }
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Security Level Configuration */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Apply Security Level</Text>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              Choose a security level to apply to this server. This will make real changes to the server configuration.
            </Text>
            
            <TouchableOpacity
              style={[styles.securityButton, styles.highSecurityButton]}
              onPress={() => applySecurityLevel('high')}
              disabled={loading}
            >
              <Text style={styles.securityButtonText}>🔴 HIGH SECURITY</Text>
              <Text style={styles.securityButtonDescription}>
                Maximum protection, strict policies
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.securityButton, styles.standardSecurityButton]}
              onPress={() => applySecurityLevel('standard')}
              disabled={loading}
            >
              <Text style={styles.securityButtonText}>🟡 STANDARD SECURITY</Text>
              <Text style={styles.securityButtonDescription}>
                Balanced security and usability
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.securityButton, styles.lowSecurityButton]}
              onPress={() => applySecurityLevel('low')}
              disabled={loading}
            >
              <Text style={styles.securityButtonText}>🟢 LOW SECURITY</Text>
              <Text style={styles.securityButtonDescription}>
                Minimal restrictions, maximum access
              </Text>
            </TouchableOpacity>
          </View>

          {/* Individual Security Features */}
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Security Features</Text>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              Toggle individual security features. Each toggle makes real changes to the server.
            </Text>

            {Object.entries(securityFeatures).map(([feature, enabled]) => (
              <View key={feature} style={styles.featureRow}>
                <View style={styles.featureInfo}>
                  <Text style={[styles.featureName, { color: theme.text }]}>
                    {feature.charAt(0).toUpperCase() + feature.slice(1).replace(/([A-Z])/g, ' $1')}
                  </Text>
                  <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                    {getFeatureDescription(feature)}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(value) => toggleSecurityFeature(feature, value)}
                  disabled={loading}
                  trackColor={{ false: '#767577', true: '#10B981' }}
                  thumbColor={enabled ? '#FFFFFF' : '#F4F3F4'}
                />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Applying security changes...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const getFeatureDescription = (feature) => {
  const descriptions = {
    firewall: 'Windows Firewall protection',
    antivirus: 'Third-party antivirus integration',
    windowsDefender: 'Windows Defender real-time protection',
    automaticUpdates: 'Automatic Windows Updates',
    uac: 'User Account Control prompts',
    remoteDesktop: 'Remote Desktop Protocol access'
  };
  
  return descriptions[feature] || 'Security feature';
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
  content: {
    flex: 1,
    padding: 16,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusLevel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusDate: {
    fontSize: 12,
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
  securityButton: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  highSecurityButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  standardSecurityButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  lowSecurityButton: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  securityButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  securityButtonDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureInfo: {
    flex: 1,
    marginRight: 12,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
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

export default SecurityOptionsModal;
