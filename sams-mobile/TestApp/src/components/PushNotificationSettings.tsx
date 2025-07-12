/**
 * 🔔 Push Notification Settings Component
 * Configure smart notifications, grouping, and do not disturb modes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MobileFeatures from '../services/MobileFeatures';

interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  led: boolean;
}

interface DoNotDisturbSchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
  weekdays: boolean[];
  allowCritical: boolean;
}

const PushNotificationSettings: React.FC = () => {
  const [notificationConfig, setNotificationConfig] = useState<any>(null);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  const mobileFeatures = MobileFeatures.getInstance();

  useEffect(() => {
    loadNotificationConfig();
  }, []);

  const loadNotificationConfig = () => {
    const config = mobileFeatures.getNotificationConfig();
    setNotificationConfig(config);
  };

  const updateConfig = (updates: any) => {
    const newConfig = { ...notificationConfig, ...updates };
    setNotificationConfig(newConfig);
    mobileFeatures.updateNotificationConfig(newConfig);
  };

  const updateChannelConfig = (channel: string, enabled: boolean) => {
    updateConfig({
      channels: {
        ...notificationConfig.channels,
        [channel]: enabled,
      },
    });
  };

  const updateDoNotDisturb = (updates: any) => {
    updateConfig({
      doNotDisturb: {
        ...notificationConfig.doNotDisturb,
        ...updates,
      },
    });
  };

  const sendTestNotification = () => {
    mobileFeatures.showSmartNotification({
      id: 'test',
      title: 'Test Notification',
      message: 'This is a test notification from SAMS',
      severity: 'medium',
      server: 'Test Server',
      acknowledged: false,
      timestamp: new Date(),
    });

    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all notification settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultConfig = {
              enabled: true,
              grouping: true,
              doNotDisturb: {
                enabled: false,
                startTime: '22:00',
                endTime: '06:00',
              },
              channels: {
                critical: true,
                high: true,
                medium: true,
                low: false,
                info: false,
              },
            };
            setNotificationConfig(defaultConfig);
            mobileFeatures.updateNotificationConfig(defaultConfig);
          },
        },
      ]
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'notifications';
      case 'info': return 'info-outline';
      default: return 'notifications';
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'critical': return '#FF3366';
      case 'high': return '#FF6B35';
      case 'medium': return '#FFA500';
      case 'low': return '#00FF88';
      case 'info': return '#00BFFF';
      default: return '#666';
    }
  };

  if (!notificationConfig) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Master Toggle */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="notifications" size={24} color="#00FF88" />
          <Text style={styles.sectionTitle}>Push Notifications</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Switch
            value={notificationConfig.enabled}
            onValueChange={(enabled) => updateConfig({ enabled })}
            trackColor={{ false: '#333', true: '#00FF88' }}
            thumbColor={notificationConfig.enabled ? '#FFF' : '#666'}
          />
        </View>
      </View>

      {notificationConfig.enabled && (
        <>
          {/* Notification Channels */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alert Severity Channels</Text>
            <Text style={styles.sectionDescription}>
              Choose which alert severities trigger notifications
            </Text>
            
            {Object.entries(notificationConfig.channels).map(([channel, enabled]) => (
              <View key={channel} style={styles.channelRow}>
                <View style={styles.channelInfo}>
                  <Icon 
                    name={getChannelIcon(channel)} 
                    size={20} 
                    color={getChannelColor(channel)} 
                  />
                  <View style={styles.channelDetails}>
                    <Text style={styles.channelName}>
                      {channel.charAt(0).toUpperCase() + channel.slice(1)} Alerts
                    </Text>
                    <Text style={styles.channelDescription}>
                      {channel === 'critical' && 'System down, immediate action required'}
                      {channel === 'high' && 'Service impact, urgent attention needed'}
                      {channel === 'medium' && 'Performance issues, monitor closely'}
                      {channel === 'low' && 'Minor issues, informational'}
                      {channel === 'info' && 'Status updates and routine events'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={enabled as boolean}
                  onValueChange={(value) => updateChannelConfig(channel, value)}
                  trackColor={{ false: '#333', true: getChannelColor(channel) }}
                  thumbColor={enabled ? '#FFF' : '#666'}
                />
              </View>
            ))}
          </View>

          {/* Smart Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Features</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Intelligent Grouping</Text>
                <Text style={styles.settingDescription}>
                  Group similar notifications to reduce noise
                </Text>
              </View>
              <Switch
                value={notificationConfig.grouping}
                onValueChange={(grouping) => updateConfig({ grouping })}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor={notificationConfig.grouping ? '#FFF' : '#666'}
              />
            </View>
          </View>

          {/* Do Not Disturb */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Do Not Disturb</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Do Not Disturb</Text>
                <Text style={styles.settingDescription}>
                  Suppress non-critical notifications during specified hours
                </Text>
              </View>
              <Switch
                value={notificationConfig.doNotDisturb.enabled}
                onValueChange={(enabled) => updateDoNotDisturb({ enabled })}
                trackColor={{ false: '#333', true: '#00FF88' }}
                thumbColor={notificationConfig.doNotDisturb.enabled ? '#FFF' : '#666'}
              />
            </View>

            {notificationConfig.doNotDisturb.enabled && (
              <>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => {
                      setTimePickerType('start');
                      setShowTimePickerModal(true);
                    }}
                  >
                    <Text style={styles.timeText}>
                      {formatTime(notificationConfig.doNotDisturb.startTime)}
                    </Text>
                    <Icon name="access-time" size={16} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => {
                      setTimePickerType('end');
                      setShowTimePickerModal(true);
                    }}
                  >
                    <Text style={styles.timeText}>
                      {formatTime(notificationConfig.doNotDisturb.endTime)}
                    </Text>
                    <Icon name="access-time" size={16} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Allow Critical Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Critical alerts will bypass Do Not Disturb
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <TouchableOpacity
              style={[styles.actionButton, testNotificationSent && styles.actionButtonSuccess]}
              onPress={sendTestNotification}
              disabled={testNotificationSent}
            >
              <Icon 
                name={testNotificationSent ? "check" : "send"} 
                size={20} 
                color={testNotificationSent ? "#00FF88" : "#FFF"} 
              />
              <Text style={[styles.actionButtonText, testNotificationSent && styles.actionButtonTextSuccess]}>
                {testNotificationSent ? 'Test Sent!' : 'Send Test Notification'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetToDefaults}
            >
              <Icon name="restore" size={20} color="#FF6B35" />
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePickerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Select {timePickerType === 'start' ? 'Start' : 'End'} Time
            </Text>
            <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.timePickerContainer}>
            <Text style={styles.timePickerNote}>
              Time picker would be implemented here using a native time picker component
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  section: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelDetails: {
    marginLeft: 12,
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  channelDescription: {
    fontSize: 12,
    color: '#666',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#FFF',
    marginRight: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonSuccess: {
    backgroundColor: '#0A2A1A',
  },
  actionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionButtonTextSuccess: {
    color: '#00FF88',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1A1A',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  resetButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#FF6B35',
  },
  modalDoneText: {
    fontSize: 16,
    color: '#00FF88',
    fontWeight: 'bold',
  },
  timePickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  timePickerNote: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default PushNotificationSettings;
