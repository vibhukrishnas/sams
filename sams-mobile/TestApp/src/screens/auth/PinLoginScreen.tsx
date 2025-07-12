/**
 * 🔐 Login Screen
 * Secure access to the SAMS system with 4-digit PIN authentication
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Real PIN validation with backend API
const validatePin = async (pin: string): Promise<boolean> => {
  try {
    const response = await fetch('http://192.168.1.10:8080/api/auth/validate-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
    });

    if (!response.ok) {
      throw new Error(`PIN validation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('PIN validation error:', error);
    return false;
  }
};

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [showError, setShowError] = useState('');

  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  const MAX_ATTEMPTS = 3;
  const LOCKOUT_TIME = 30; // 30 seconds for demo

  useEffect(() => {
    // Fade in animation on mount
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // Handle lockout timer
    let timer: NodeJS.Timeout;
    if (isLocked && lockTimeRemaining > 0) {
      timer = setTimeout(() => {
        setLockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            setShowError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isLocked, lockTimeRemaining]);

  const handlePinChange = (value: string) => {
    if (value.length <= 4 && !isLocked && /^\d*$/.test(value)) {
      setPin(value);
      setShowError('');

      // Auto-submit when 4 digits entered
      if (value.length === 4) {
        setTimeout(() => handleLogin(value), 200);
      }
    }
  };

  const handleLogin = async (pinToSubmit: string = pin) => {
    if (pinToSubmit.length !== 4 || isLocked) return;

    setIsLoading(true);
    setShowError('');

    try {
      const isValid = await validatePin(pinToSubmit);

      if (isValid) {
        // Success - Navigate to Dashboard with sidebar
        navigation.replace('Main');
      } else {
        // Failed attempt
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        setPin('');

        if (newFailedAttempts >= MAX_ATTEMPTS) {
          // Temporary lockout
          setIsLocked(true);
          setLockTimeRemaining(LOCKOUT_TIME);
          setShowError('Too many failed attempts. Account temporarily locked.');
        } else {
          // Show error message
          setShowError('Invalid PIN. Please try again.');

          // Shake animation for wrong PIN
          Animated.sequence([
            Animated.timing(shakeAnimation, {
              toValue: 10,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
              toValue: -10,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
              toValue: 10,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();

          Vibration.vibrate([0, 100, 50, 100]);
        }
      }
    } catch (error) {
      setShowError('Connection failed. Please check your network.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot PIN',
      'Please contact your system administrator to reset your PIN.',
      [{ text: 'OK' }]
    );
  };

  const handleBiometricAuth = async () => {
    // Optional biometric authentication
    Alert.alert(
      'Biometric Authentication',
      'Biometric authentication is not yet implemented.',
      [{ text: 'OK' }]
    );
  };

  const renderPinInput = () => {
    return (
      <Animated.View
        style={[
          styles.pinInputContainer,
          { transform: [{ translateX: shakeAnimation }] }
        ]}
      >
        <TextInput
          style={styles.pinInput}
          value={pin}
          onChangeText={handlePinChange}
          placeholder="Enter 4-digit PIN"
          placeholderTextColor="#666"
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry={true}
          editable={!isLoading && !isLocked}
          autoFocus={true}
        />
      </Animated.View>
    );
  };

  const renderLoginButton = () => {
    return (
      <TouchableOpacity
        style={[
          styles.loginButton,
          (pin.length !== 4 || isLoading || isLocked) && styles.loginButtonDisabled
        ]}
        onPress={() => handleLogin(pin)}
        disabled={pin.length !== 4 || isLoading || isLocked}
      >
        <Text style={[
          styles.loginButtonText,
          (pin.length !== 4 || isLoading || isLocked) && styles.loginButtonTextDisabled
        ]}>
          {isLoading ? 'Authenticating...' : 'Login'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderForgotPin = () => {
    return (
      <TouchableOpacity
        style={styles.forgotPinButton}
        onPress={handleForgotPin}
        disabled={isLoading}
      >
        <Text style={styles.forgotPinText}>Forgot PIN?</Text>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnimation }
          ]}
        >
          {/* App Logo and Title */}
          <View style={styles.header}>
            <Text style={styles.logo}>🖥️</Text>
            <Text style={styles.title}>SAMS</Text>
            <Text style={styles.subtitle}>Server Alert Management System</Text>
          </View>

          {/* 4-digit PIN Input Field */}
          {renderPinInput()}

          {/* Error Messages */}
          {showError ? (
            <Text style={styles.errorText}>{showError}</Text>
          ) : null}

          {/* Lockout Timer */}
          {isLocked && lockTimeRemaining > 0 && (
            <Text style={styles.lockoutText}>
              Account locked. Try again in {lockTimeRemaining} seconds.
            </Text>
          )}

          {/* Failed Attempts Counter */}
          {failedAttempts > 0 && !isLocked && (
            <Text style={styles.attemptsText}>
              {MAX_ATTEMPTS - failedAttempts} attempts remaining
            </Text>
          )}

          {/* Login Button */}
          {renderLoginButton()}

          {/* Forgot PIN Option */}
          {renderForgotPin()}

          {/* Optional Biometric Authentication */}
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
            disabled={isLoading || isLocked}
          >
            <Icon name="fingerprint" size={24} color="#00FF88" />
            <Text style={styles.biometricText}>Use Biometric</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  pinInputContainer: {
    marginBottom: 30,
  },
  pinInput: {
    width: width * 0.7,
    height: 60,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    fontSize: 24,
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 8,
  },
  errorText: {
    color: '#FF3366',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  lockoutText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  attemptsText: {
    color: '#FFA500',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    width: width * 0.7,
    height: 50,
    backgroundColor: '#00FF88',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#333',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  loginButtonTextDisabled: {
    color: '#666',
  },
  forgotPinButton: {
    marginBottom: 30,
  },
  forgotPinText: {
    color: '#00FF88',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  biometricText: {
    color: '#00FF88',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default LoginScreen;
