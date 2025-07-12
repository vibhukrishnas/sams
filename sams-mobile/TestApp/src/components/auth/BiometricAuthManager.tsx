import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TouchID from 'react-native-touch-id';
import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../../theme';
import { HapticFeedback } from '../haptic/HapticFeedback';

interface BiometricCapabilities {
  available: boolean;
  biometryType: 'TouchID' | 'FaceID' | 'Fingerprint' | 'Face' | 'None';
  error?: string;
}

interface Props {
  onSuccess: (method: 'biometric' | 'fallback') => void;
  onError: (error: string) => void;
  onCancel: () => void;
  isDark: boolean;
  visible: boolean;
  title?: string;
  subtitle?: string;
  fallbackEnabled?: boolean;
}

const BiometricAuthManager: React.FC<Props> = ({
  onSuccess,
  onError,
  onCancel,
  isDark,
  visible,
  title = 'Authenticate',
  subtitle = 'Use your biometric to access SAMS',
  fallbackEnabled = true,
}) => {
  const theme = getTheme(isDark);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>({
    available: false,
    biometryType: 'None',
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (visible) {
      checkBiometricCapabilities();
    }
  }, [visible]);

  const checkBiometricCapabilities = async () => {
    try {
      // Check with react-native-biometrics (more reliable)
      const rnBiometrics = new ReactNativeBiometrics();
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();

      if (available) {
        setCapabilities({
          available: true,
          biometryType: biometryType as any,
        });
        
        // Auto-start authentication if biometrics are available
        setTimeout(() => {
          authenticateWithBiometrics();
        }, 500);
      } else {
        // Fallback to TouchID library for older devices
        try {
          const touchIDSupported = await TouchID.isSupported();
          if (touchIDSupported) {
            setCapabilities({
              available: true,
              biometryType: touchIDSupported as any,
            });
            setTimeout(() => {
              authenticateWithTouchID();
            }, 500);
          } else {
            setCapabilities({
              available: false,
              biometryType: 'None',
              error: 'Biometric authentication not available',
            });
            if (fallbackEnabled) {
              setShowFallback(true);
            } else {
              onError('Biometric authentication not available');
            }
          }
        } catch (touchIDError) {
          setCapabilities({
            available: false,
            biometryType: 'None',
            error: 'Biometric authentication not supported',
          });
          if (fallbackEnabled) {
            setShowFallback(true);
          } else {
            onError('Biometric authentication not supported');
          }
        }
      }
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      setCapabilities({
        available: false,
        biometryType: 'None',
        error: 'Failed to check biometric capabilities',
      });
      if (fallbackEnabled) {
        setShowFallback(true);
      } else {
        onError('Failed to check biometric capabilities');
      }
    }
  };

  const authenticateWithBiometrics = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    HapticFeedback.buttonPress();

    try {
      const rnBiometrics = new ReactNativeBiometrics();
      
      // Create a signature to verify authentication
      const { success, signature } = await rnBiometrics.createSignature({
        promptMessage: title,
        payload: `sams_auth_${Date.now()}`,
      });

      if (success && signature) {
        HapticFeedback.successAction();
        
        // Store successful biometric authentication
        await AsyncStorage.setItem('last_biometric_auth', new Date().toISOString());
        
        onSuccess('biometric');
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      HapticFeedback.errorOccurred();
      
      if (error.message.includes('UserCancel') || error.message.includes('UserFallback')) {
        if (fallbackEnabled) {
          setShowFallback(true);
        } else {
          onCancel();
        }
      } else {
        onError(error.message || 'Biometric authentication failed');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const authenticateWithTouchID = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    HapticFeedback.buttonPress();

    try {
      const optionalConfigObject = {
        title: title,
        imageColor: theme.colors.primary,
        imageErrorColor: '#FF0000',
        sensorDescription: subtitle,
        sensorErrorDescription: 'Failed to authenticate',
        cancelText: 'Cancel',
        fallbackLabel: fallbackEnabled ? 'Use PIN' : '',
        unifiedErrors: false,
        passcodeFallback: fallbackEnabled,
      };

      await TouchID.authenticate(subtitle, optionalConfigObject);
      
      HapticFeedback.successAction();
      
      // Store successful biometric authentication
      await AsyncStorage.setItem('last_biometric_auth', new Date().toISOString());
      
      onSuccess('biometric');
    } catch (error: any) {
      console.error('TouchID authentication error:', error);
      HapticFeedback.errorOccurred();
      
      if (error.name === 'UserCancel') {
        onCancel();
      } else if (error.name === 'UserFallback') {
        if (fallbackEnabled) {
          setShowFallback(true);
        } else {
          onCancel();
        }
      } else {
        onError(error.message || 'Biometric authentication failed');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleFallbackAuth = () => {
    HapticFeedback.buttonPress();
    onSuccess('fallback');
  };

  const handleRetry = () => {
    HapticFeedback.buttonPress();
    setShowFallback(false);
    
    if (capabilities.available) {
      if (capabilities.biometryType !== 'None') {
        authenticateWithBiometrics();
      } else {
        authenticateWithTouchID();
      }
    }
  };

  const getBiometricIcon = () => {
    switch (capabilities.biometryType) {
      case 'FaceID':
      case 'Face':
        return 'face';
      case 'TouchID':
      case 'Fingerprint':
        return 'fingerprint';
      default:
        return 'security';
    }
  };

  const getBiometricLabel = () => {
    switch (capabilities.biometryType) {
      case 'FaceID':
        return 'Face ID';
      case 'Face':
        return 'Face Recognition';
      case 'TouchID':
        return 'Touch ID';
      case 'Fingerprint':
        return 'Fingerprint';
      default:
        return 'Biometric Authentication';
    }
  };

  const renderBiometricPrompt = () => (
    <View style={styles.promptContainer}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
        <Icon
          name={getBiometricIcon()}
          size={48}
          color={theme.colors.primary}
        />
      </View>
      
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {subtitle}
      </Text>
      
      <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
        {capabilities.biometryType === 'FaceID' || capabilities.biometryType === 'Face'
          ? 'Look at your device to authenticate'
          : 'Place your finger on the sensor'}
      </Text>
      
      {isAuthenticating && (
        <View style={styles.authenticatingContainer}>
          <Text style={[styles.authenticatingText, { color: theme.colors.primary }]}>
            Authenticating...
          </Text>
        </View>
      )}
    </View>
  );

  const renderFallbackPrompt = () => (
    <View style={styles.promptContainer}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.warning + '20' }]}>
        <Icon
          name="lock"
          size={48}
          color={theme.colors.warning}
        />
      </View>
      
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Biometric Unavailable
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {capabilities.error || 'Please use alternative authentication'}
      </Text>
      
      <View style={styles.buttonContainer}>
        {capabilities.available && (
          <TouchableOpacity
            style={[styles.button, styles.retryButton, { borderColor: theme.colors.primary }]}
            onPress={handleRetry}
          >
            <Icon name="refresh" size={20} color={theme.colors.primary} />
            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.button, styles.fallbackButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleFallbackAuth}
        >
          <Icon name="vpn-key" size={20} color="#FFFFFF" />
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
            Use PIN
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onCancel}
          >
            <Icon name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          {showFallback ? renderFallbackPrompt() : renderBiometricPrompt()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  promptContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  authenticatingContainer: {
    paddingVertical: 16,
  },
  authenticatingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    borderWidth: 1,
  },
  fallbackButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BiometricAuthManager;
