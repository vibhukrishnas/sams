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
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  setTheme,
  updateAccessibilitySettings,
  setHapticFeedback,
  setAnimations,
  setGestureNavigation,
  setBiometricEnabled,
  updateNotificationSettings,
} from '../../store/slices/settingsSlice';
import { showToast } from '../../store/slices/uiSlice';
import HapticService from '../../services/HapticService';
import AccessibilityService from '../../services/AccessibilityService';
import EnhancedBiometricService from '../../services/EnhancedBiometricService';
import GestureService from '../../services/GestureService';
import SettingsSection from '../../components/settings/SettingsSection';
import SettingsItem from '../../components/settings/SettingsItem';
import ThemeSelector from '../../components/settings/ThemeSelector';
import FontSizeSelector from '../../components/settings/FontSizeSelector';
import NotificationSettingsModal from '../../components/settings/NotificationSettingsModal';

const EnhancedSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark, toggleTheme, setThemeMode } = useTheme();
  const dispatch = useAppDispatch();
  
  const { app, accessibility, security, notifications } = useAppSelector(state => state.settings);
  
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    checkBiometricAvailability();
    
    // Update services with current settings
    HapticService.updateSettings(app.hapticFeedback);
    GestureService.updateSettings(app.gestureNavigation);
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await EnhancedBiometricService.isAvailable();
    setBiometricAvailable(available);
    
    if (available) {
      const primaryBiometric = EnhancedBiometricService.getPrimaryBiometricType();
      setBiometricType(primaryBiometric?.type || '');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeMode(newTheme);
    dispatch(setTheme(newTheme));
    HapticService.buttonPress();
    
    dispatch(showToast({
      message: `Theme changed to ${newTheme}`,
      type: 'success',
      duration: 2000,
    }));
  };

  const handleHapticToggle = (enabled: boolean) => {
    dispatch(setHapticFeedback(enabled));
    HapticService.updateSettings(enabled);
    
    if (enabled) {
      HapticService.buttonPress();
    }
    
    dispatch(showToast({
      message: `Haptic feedback ${enabled ? 'enabled' : 'disabled'}`,
      type: 'success',
      duration: 2000,
    }));
  };

  const handleAnimationsToggle = (enabled: boolean) => {
    dispatch(setAnimations(enabled));
    HapticService.buttonPress();
    
    dispatch(showToast({
      message: `Animations ${enabled ? 'enabled' : 'disabled'}`,
      type: 'success',
      duration: 2000,
    }));
  };

  const handleGestureToggle = (enabled: boolean) => {
    dispatch(setGestureNavigation(enabled));
    GestureService.updateSettings(enabled);
    HapticService.buttonPress();
    
    dispatch(showToast({
      message: `Gesture navigation ${enabled ? 'enabled' : 'disabled'}`,
      type: 'success',
      duration: 2000,
    }));
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    HapticService.buttonPress();
    
    if (enabled) {
      const result = await EnhancedBiometricService.enableBiometric();
      if (result.success) {
        dispatch(setBiometricEnabled(true));
        dispatch(showToast({
          message: 'Biometric authentication enabled',
          type: 'success',
          duration: 2000,
        }));
      } else {
        Alert.alert('Authentication Failed', result.error || 'Failed to enable biometric authentication');
      }
    } else {
      Alert.alert(
        'Disable Biometric Authentication',
        'Are you sure you want to disable biometric authentication?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await EnhancedBiometricService.disableBiometric();
              dispatch(setBiometricEnabled(false));
              dispatch(showToast({
                message: 'Biometric authentication disabled',
                type: 'success',
                duration: 2000,
              }));
            },
          },
        ]
      );
    }
  };

  const handleAccessibilityToggle = (key: string, value: boolean) => {
    dispatch(updateAccessibilitySettings({ [key]: value }));
    HapticService.buttonPress();
    
    if (key === 'enabled' && value) {
      AccessibilityService.announceForAccessibility('Accessibility features enabled');
    }
    
    dispatch(showToast({
      message: `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`,
      type: 'success',
      duration: 2000,
    }));
  };

  const handleFontSizeChange = (fontSize: 'small' | 'normal' | 'large' | 'extraLarge') => {
    dispatch(updateAccessibilitySettings({ fontSize }));
    HapticService.buttonPress();
    
    dispatch(showToast({
      message: `Font size changed to ${fontSize}`,
      type: 'success',
      duration: 2000,
    }));
  };

  const handleColorBlindSupportChange = (support: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') => {
    dispatch(updateAccessibilitySettings({ colorBlindSupport: support }));
    HapticService.buttonPress();
    
    dispatch(showToast({
      message: support === 'none' ? 'Color blind support disabled' : `Color blind support: ${support}`,
      type: 'success',
      duration: 2000,
    }));
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    dispatch(updateNotificationSettings({ [key]: value }));
    HapticService.buttonPress();
    
    dispatch(showToast({
      message: `${key} notifications ${value ? 'enabled' : 'disabled'}`,
      type: 'success',
      duration: 2000,
    }));
  };

  const getBiometricDisplayName = () => {
    switch (biometricType) {
      case 'TouchID': return 'Touch ID';
      case 'FaceID': return 'Face ID';
      case 'Fingerprint': return 'Fingerprint';
      default: return 'Biometric';
    }
  };

  const getBiometricIcon = () => {
    return EnhancedBiometricService.getBiometricIcon(biometricType);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            HapticService.buttonPress();
            navigation.goBack();
          }}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Settings
        </Text>
        
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => {
            HapticService.buttonPress();
            toggleTheme();
          }}
        >
          <Icon 
            name={isDark ? 'light-mode' : 'dark-mode'} 
            size={24} 
            color={theme.colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Appearance Section */}
        <SettingsSection title="Appearance" icon="palette">
          <SettingsItem
            title="Theme"
            subtitle={`Current: ${app.theme}`}
            icon="brightness-6"
            onPress={() => setShowThemeSelector(true)}
            showArrow
          />
          
          <SettingsItem
            title="Animations"
            subtitle="Enable smooth transitions"
            icon="animation"
            rightComponent={
              <Switch
                value={app.animations}
                onValueChange={handleAnimationsToggle}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            }
          />
        </SettingsSection>

        {/* Interaction Section */}
        <SettingsSection title="Interaction" icon="touch-app">
          <SettingsItem
            title="Haptic Feedback"
            subtitle="Feel vibrations for interactions"
            icon="vibration"
            rightComponent={
              <Switch
                value={app.hapticFeedback}
                onValueChange={handleHapticToggle}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            }
          />
          
          <SettingsItem
            title="Gesture Navigation"
            subtitle="Swipe gestures for navigation"
            icon="gesture"
            rightComponent={
              <Switch
                value={app.gestureNavigation}
                onValueChange={handleGestureToggle}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            }
          />
        </SettingsSection>

        {/* Security Section */}
        <SettingsSection title="Security" icon="security">
          {biometricAvailable && (
            <SettingsItem
              title={getBiometricDisplayName()}
              subtitle="Use biometric authentication"
              icon={getBiometricIcon()}
              rightComponent={
                <Switch
                  value={security.biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                  thumbColor={theme.colors.surface}
                />
              }
            />
          )}
          
          <SettingsItem
            title="Auto Lock"
            subtitle="Lock app when inactive"
            icon="lock-clock"
            rightComponent={
              <Switch
                value={security.autoLock}
                onValueChange={(value) => {
                  // Handle auto lock toggle
                  HapticService.buttonPress();
                }}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            }
          />
        </SettingsSection>

        {/* Accessibility Section */}
        <SettingsSection title="Accessibility" icon="accessibility">
          <SettingsItem
            title="Enable Accessibility"
            subtitle="Turn on accessibility features"
            icon="accessibility"
            rightComponent={
              <Switch
                value={accessibility.enabled}
                onValueChange={(value) => handleAccessibilityToggle('enabled', value)}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            }
          />
          
          {accessibility.enabled && (
            <>
              <SettingsItem
                title="Font Size"
                subtitle={`Current: ${accessibility.fontSize}`}
                icon="format-size"
                onPress={() => setShowFontSelector(true)}
                showArrow
              />
              
              <SettingsItem
                title="High Contrast"
                subtitle="Increase color contrast"
                icon="contrast"
                rightComponent={
                  <Switch
                    value={accessibility.highContrast}
                    onValueChange={(value) => handleAccessibilityToggle('highContrast', value)}
                    trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                    thumbColor={theme.colors.surface}
                  />
                }
              />
              
              <SettingsItem
                title="Reduce Motion"
                subtitle="Minimize animations"
                icon="motion-photos-off"
                rightComponent={
                  <Switch
                    value={accessibility.reduceMotion}
                    onValueChange={(value) => handleAccessibilityToggle('reduceMotion', value)}
                    trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                    thumbColor={theme.colors.surface}
                  />
                }
              />
              
              <SettingsItem
                title="Voice Commands"
                subtitle="Enable voice control"
                icon="mic"
                rightComponent={
                  <Switch
                    value={accessibility.voiceCommands}
                    onValueChange={(value) => handleAccessibilityToggle('voiceCommands', value)}
                    trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                    thumbColor={theme.colors.surface}
                  />
                }
              />
            </>
          )}
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications" icon="notifications">
          <SettingsItem
            title="Push Notifications"
            subtitle="Receive alert notifications"
            icon="notifications-active"
            rightComponent={
              <Switch
                value={notifications.enabled}
                onValueChange={(value) => handleNotificationToggle('enabled', value)}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            }
          />
          
          <SettingsItem
            title="Notification Settings"
            subtitle="Customize notification preferences"
            icon="tune"
            onPress={() => setShowNotificationModal(true)}
            showArrow
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About" icon="info">
          <SettingsItem
            title="Version"
            subtitle="1.0.0 (Build 1)"
            icon="info"
          />
          
          <SettingsItem
            title="Privacy Policy"
            subtitle="View our privacy policy"
            icon="privacy-tip"
            onPress={() => {
              HapticService.buttonPress();
              // Navigate to privacy policy
            }}
            showArrow
          />
        </SettingsSection>
      </ScrollView>

      {/* Modals */}
      <ThemeSelector
        visible={showThemeSelector}
        currentTheme={app.theme}
        onSelect={handleThemeChange}
        onClose={() => setShowThemeSelector(false)}
      />
      
      <FontSizeSelector
        visible={showFontSelector}
        currentSize={accessibility.fontSize}
        onSelect={handleFontSizeChange}
        onClose={() => setShowFontSelector(false)}
      />
      
      <NotificationSettingsModal
        visible={showNotificationModal}
        settings={notifications}
        onSave={(newSettings) => {
          dispatch(updateNotificationSettings(newSettings));
          setShowNotificationModal(false);
          HapticService.successAction();
        }}
        onClose={() => setShowNotificationModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerAction: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});

export default EnhancedSettingsScreen;
