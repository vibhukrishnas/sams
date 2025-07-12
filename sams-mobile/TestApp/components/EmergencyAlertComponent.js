/**
 * 🚨 Emergency Alert Component
 * SOS emergency alerts with sound, vibration, and critical notifications
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
  Alert,
  Animated,
  Modal
} from 'react-native';
import EmergencyAlertManager from '../services/emergencyAlertManager';

const EmergencyAlertComponent = ({ theme, servers }) => {
  const [sosActive, setSOSActive] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false);
  const [emergencyStats, setEmergencyStats] = useState({});

  const pulseAnim = new Animated.Value(1);
  const flashAnim = new Animated.Value(0);

  useEffect(() => {
    setupEmergencyListener();
    loadEmergencyState();
    
    // Start pulse animation for SOS button
    startPulseAnimation();
    
    return () => {
      // Cleanup
    };
  }, []);

  const setupEmergencyListener = () => {
    const unsubscribe = EmergencyAlertManager.addSOSListener((notification) => {
      // Emergency notification received
      
      switch (notification.type) {
        case 'SOS_TRIGGERED':
          setSOSActive(true);
          startFlashAnimation();
          break;
        case 'SOS_ACKNOWLEDGED':
          setSOSActive(false);
          stopFlashAnimation();
          break;
        case 'SOS_ESCALATED':
          startFlashAnimation();
          break;
      }
      
      loadEmergencyState();
    });

    return unsubscribe;
  };

  const loadEmergencyState = () => {
    const stats = EmergencyAlertManager.getEmergencyStatistics();
    setEmergencyStats(stats);
    setSOSActive(stats.isSOSActive);
    
    // Load active alerts
    const alerts = Array.from(EmergencyAlertManager.activeAlerts.values());
    setActiveAlerts(alerts);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startFlashAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopFlashAnimation = () => {
    flashAnim.stopAnimation();
    flashAnim.setValue(0);
  };

  const triggerManualSOS = () => {
    Alert.alert(
      '🚨 TRIGGER SOS ALERT',
      'This will trigger an emergency SOS alert for all connected servers.\n\nThis action should only be used in genuine emergencies.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🚨 TRIGGER SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              if (servers && servers.length > 0) {
                const server = servers[0]; // Use first server
                await EmergencyAlertManager.triggerSOSAlert(server, 'MANUAL_SOS', 'CRITICAL');
                
                Alert.alert(
                  '🚨 SOS TRIGGERED',
                  'Emergency SOS alert has been triggered!\n\nEmergency protocols activated.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('❌ Error', 'No servers available for SOS alert.');
              }
            } catch (error) {
              Alert.alert('❌ Error', `Failed to trigger SOS: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const testEmergencySystem = async () => {
    Alert.alert(
      '🧪 Test Emergency System',
      'This will test the emergency alert system with a non-critical test alert.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🧪 Run Test',
          onPress: async () => {
            try {
              if (servers && servers.length > 0) {
                const server = servers[0];
                await EmergencyAlertManager.triggerSOSAlert(server, 'SYSTEM_TEST', 'LOW');
                
                Alert.alert(
                  '✅ Test Complete',
                  'Emergency system test completed successfully!\n\nAll emergency protocols are functional.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('❌ Error', 'No servers available for testing.');
              }
            } catch (error) {
              Alert.alert('❌ Error', `Test failed: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const checkCriticalAlerts = async () => {
    if (!servers || servers.length === 0) {
      Alert.alert('❌ Error', 'No servers available to check.');
      return;
    }

    try {
      for (const server of servers) {
        await EmergencyAlertManager.checkForCriticalAlerts(server);
      }
      
      Alert.alert(
        '✅ Alert Check Complete',
        'Critical alert check completed for all servers.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('❌ Error', `Alert check failed: ${error.message}`);
    }
  };

  const clearSOSState = () => {
    Alert.alert(
      '🛑 Clear SOS State',
      'This will clear the current SOS state and stop all emergency alerts.\n\nOnly do this if the emergency has been resolved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🛑 Clear SOS',
          style: 'destructive',
          onPress: () => {
            EmergencyAlertManager.clearSOSState();
            setSOSActive(false);
            stopFlashAnimation();
            loadEmergencyState();
            
            Alert.alert(
              '✅ SOS Cleared',
              'SOS state has been cleared.\n\nEmergency alerts stopped.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Emergency Status Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          🚨 Emergency Alert System
        </Text>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: sosActive ? '#EF4444' : '#10B981' }
        ]}>
          <Text style={styles.statusText}>
            {sosActive ? '🚨 SOS ACTIVE' : '✅ NORMAL'}
          </Text>
        </View>
      </View>

      {/* SOS Flash Overlay */}
      {sosActive && (
        <Animated.View
          style={[
            styles.flashOverlay,
            {
              opacity: flashAnim,
              backgroundColor: '#EF4444'
            }
          ]}
        />
      )}

      {/* Emergency Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {emergencyStats.activeAlerts || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Active Alerts
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {emergencyStats.totalAlerts || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Total Alerts
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {emergencyStats.escalatedAlerts || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Escalated
          </Text>
        </View>
      </View>

      {/* Emergency Action Buttons */}
      <View style={styles.actionContainer}>
        {/* SOS Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.sosButton,
              { backgroundColor: sosActive ? '#DC2626' : '#EF4444' }
            ]}
            onPress={triggerManualSOS}
          >
            <Text style={styles.sosButtonText}>🚨</Text>
            <Text style={styles.sosButtonLabel}>SOS</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.testButton]}
            onPress={testEmergencySystem}
          >
            <Text style={styles.actionButtonText}>🧪 Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.checkButton]}
            onPress={checkCriticalAlerts}
          >
            <Text style={styles.actionButtonText}>🔍 Check</Text>
          </TouchableOpacity>

          {sosActive && (
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={clearSOSState}
            >
              <Text style={styles.actionButtonText}>🛑 Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active Alerts List */}
      {activeAlerts.length > 0 && (
        <View style={styles.alertsList}>
          <Text style={[styles.alertsTitle, { color: theme.text }]}>
            🚨 Active Emergency Alerts
          </Text>
          {activeAlerts.slice(0, 3).map((alert, index) => (
            <View key={alert.id} style={[styles.alertItem, { backgroundColor: theme.background }]}>
              <Text style={[styles.alertText, { color: theme.text }]}>
                {alert.alertType} - {alert.server.name}
              </Text>
              <Text style={[styles.alertTime, { color: theme.textSecondary }]}>
                {new Date(alert.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    alignItems: 'center',
  },
  sosButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonText: {
    fontSize: 32,
    marginBottom: 4,
  },
  sosButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#3B82F6',
  },
  checkButton: {
    backgroundColor: '#F59E0B',
  },
  clearButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alertsList: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  alertItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  alertTime: {
    fontSize: 12,
  },
});

export default EmergencyAlertComponent;
