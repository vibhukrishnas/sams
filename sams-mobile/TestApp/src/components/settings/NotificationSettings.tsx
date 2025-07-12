import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../../theme';
import { HapticFeedback } from '../haptic/HapticFeedback';
import { AccessibilityWrapper } from '../accessibility/AccessibilityWrapper';

interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  lockScreen: boolean;
  bannerStyle: 'temporary' | 'persistent';
  grouping: boolean;
  
  // Alert-specific settings
  criticalAlerts: boolean;
  highPriorityAlerts: boolean;
  mediumPriorityAlerts: boolean;
  lowPriorityAlerts: boolean;
  infoAlerts: boolean;
  
  // Timing settings
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  
  // Server-specific settings
  serverNotifications: {
    [serverId: string]: {
      enabled: boolean;
      alertTypes: string[];
    };
  };
  
  // Delivery settings
  deliveryMethod: 'immediate' | 'batched' | 'digest';
  batchInterval: number; // minutes
  digestTime: string; // HH:MM format
}

interface Props {
  isDark: boolean;
  onSettingsChange?: (settings: NotificationPreferences) => void;
}

const NotificationSettings: React.FC<Props> = ({ isDark, onSettingsChange }) => {
  const theme = getTheme(isDark);
  const [settings, setSettings] = useState<NotificationPreferences>({
    enabled: true,
    sound: true,
    vibration: true,
    badge: true,
    lockScreen: true,
    bannerStyle: 'temporary',
    grouping: true,
    criticalAlerts: true,
    highPriorityAlerts: true,
    mediumPriorityAlerts: true,
    lowPriorityAlerts: false,
    infoAlerts: false,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
    },
    serverNotifications: {},
    deliveryMethod: 'immediate',
    batchInterval: 15,
    digestTime: '09:00',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...settings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationPreferences) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const updateSetting = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
    HapticFeedback.switchToggle();
  };

  const updateNestedSetting = (
    parentKey: keyof NotificationPreferences,
    childKey: string,
    value: any
  ) => {
    const newSettings = {
      ...settings,
      [parentKey]: {
        ...(settings[parentKey] as any),
        [childKey]: value,
      },
    };
    saveSettings(newSettings);
    HapticFeedback.switchToggle();
  };

  const renderToggleRow = (
    title: string,
    subtitle: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    icon?: string,
    disabled?: boolean
  ) => (
    <AccessibilityWrapper
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={[
        styles.settingRow,
        { borderBottomColor: theme.colors.border },
        disabled && { opacity: 0.5 }
      ]}>
        <View style={styles.settingContent}>
          {icon && (
            <Icon
              name={icon}
              size={24}
              color={disabled ? theme.colors.textSecondary : theme.colors.primary}
              style={styles.settingIcon}
            />
          )}
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
    </AccessibilityWrapper>
  );

  const renderOptionRow = (
    title: string,
    subtitle: string,
    options: Array<{ label: string; value: string }>,
    selectedValue: string,
    onSelect: (value: string) => void,
    icon?: string
  ) => (
    <View style={[styles.settingRow, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.settingContent}>
        {icon && (
          <Icon
            name={icon}
            size={24}
            color={theme.colors.primary}
            style={styles.settingIcon}
          />
        )}
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.optionButtons}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              {
                backgroundColor: selectedValue === option.value
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={() => {
              onSelect(option.value);
              HapticFeedback.buttonPress();
            }}
          >
            <Text
              style={[
                styles.optionButtonText,
                {
                  color: selectedValue === option.value
                    ? '#FFFFFF'
                    : theme.colors.text,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSectionHeader = (title: string, icon?: string) => (
    <View style={styles.sectionHeader}>
      {icon && (
        <Icon
          name={icon}
          size={20}
          color={theme.colors.primary}
          style={styles.sectionIcon}
        />
      )}
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* General Settings */}
      {renderSectionHeader('General', 'notifications')}
      
      {renderToggleRow(
        'Push Notifications',
        'Enable or disable all push notifications',
        settings.enabled,
        (value) => updateSetting('enabled', value),
        'notifications'
      )}

      {renderToggleRow(
        'Sound',
        'Play sound for notifications',
        settings.sound,
        (value) => updateSetting('sound', value),
        'volume-up',
        !settings.enabled
      )}

      {renderToggleRow(
        'Vibration',
        'Vibrate device for notifications',
        settings.vibration,
        (value) => updateSetting('vibration', value),
        'vibration',
        !settings.enabled
      )}

      {renderToggleRow(
        'Badge Count',
        'Show notification count on app icon',
        settings.badge,
        (value) => updateSetting('badge', value),
        'fiber-manual-record',
        !settings.enabled
      )}

      {renderToggleRow(
        'Lock Screen',
        'Show notifications on lock screen',
        settings.lockScreen,
        (value) => updateSetting('lockScreen', value),
        'lock',
        !settings.enabled
      )}

      {/* Banner Style */}
      {renderOptionRow(
        'Banner Style',
        'How notifications appear on screen',
        [
          { label: 'Temporary', value: 'temporary' },
          { label: 'Persistent', value: 'persistent' },
        ],
        settings.bannerStyle,
        (value) => updateSetting('bannerStyle', value as 'temporary' | 'persistent'),
        'view-carousel'
      )}

      {/* Alert Priority Settings */}
      {renderSectionHeader('Alert Priorities', 'priority-high')}

      {renderToggleRow(
        'Critical Alerts',
        'System failures and emergencies',
        settings.criticalAlerts,
        (value) => updateSetting('criticalAlerts', value),
        'error',
        !settings.enabled
      )}

      {renderToggleRow(
        'High Priority Alerts',
        'Important issues requiring attention',
        settings.highPriorityAlerts,
        (value) => updateSetting('highPriorityAlerts', value),
        'warning',
        !settings.enabled
      )}

      {renderToggleRow(
        'Medium Priority Alerts',
        'Moderate issues and warnings',
        settings.mediumPriorityAlerts,
        (value) => updateSetting('mediumPriorityAlerts', value),
        'info',
        !settings.enabled
      )}

      {renderToggleRow(
        'Low Priority Alerts',
        'Minor issues and maintenance',
        settings.lowPriorityAlerts,
        (value) => updateSetting('lowPriorityAlerts', value),
        'low-priority',
        !settings.enabled
      )}

      {renderToggleRow(
        'Info Alerts',
        'General information and updates',
        settings.infoAlerts,
        (value) => updateSetting('infoAlerts', value),
        'info-outline',
        !settings.enabled
      )}

      {/* Delivery Settings */}
      {renderSectionHeader('Delivery', 'schedule')}

      {renderOptionRow(
        'Delivery Method',
        'How notifications are delivered',
        [
          { label: 'Immediate', value: 'immediate' },
          { label: 'Batched', value: 'batched' },
          { label: 'Daily Digest', value: 'digest' },
        ],
        settings.deliveryMethod,
        (value) => updateSetting('deliveryMethod', value as 'immediate' | 'batched' | 'digest'),
        'send'
      )}

      {/* Quiet Hours */}
      {renderSectionHeader('Quiet Hours', 'bedtime')}

      {renderToggleRow(
        'Enable Quiet Hours',
        'Silence notifications during specified hours',
        settings.quietHours.enabled,
        (value) => updateNestedSetting('quietHours', 'enabled', value),
        'do-not-disturb',
        !settings.enabled
      )}

      {/* Advanced Settings */}
      {renderSectionHeader('Advanced', 'settings')}

      {renderToggleRow(
        'Group Notifications',
        'Group similar notifications together',
        settings.grouping,
        (value) => updateSetting('grouping', value),
        'group-work',
        !settings.enabled
      )}

      {/* Test Notification */}
      <View style={styles.testSection}>
        <TouchableOpacity
          style={[
            styles.testButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: settings.enabled ? 1 : 0.5,
            },
          ]}
          onPress={() => {
            if (settings.enabled) {
              Alert.alert('Test Notification', 'This is how your notifications will appear.');
              HapticFeedback.buttonPress();
            }
          }}
          disabled={!settings.enabled}
        >
          <Icon name="notifications-active" size={20} color="#FFFFFF" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 16,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testSection: {
    padding: 16,
    marginTop: 24,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NotificationSettings;
