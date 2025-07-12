import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../../context/AuthContext';
// import PinInput from '../../components/PinInput';

const LoginScreen = () => {
  const {login, lockoutTime} = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    // Check for lockout on component mount
    if (lockoutTime && Date.now() < lockoutTime) {
      const remainingTime = Math.ceil((lockoutTime - Date.now()) / 1000 / 60);
      setError(`Account is locked. Try again in ${remainingTime} minutes.`);
    }
  }, [lockoutTime]);

  const handlePinComplete = async (pin) => {
    if (isLoading) return;

    console.log('🔐 Login attempt started with PIN:', pin);
    setIsLoading(true);
    setError('');

    try {
      const result = await login(pin);
      console.log('🔍 Login result:', result);

      if (!result.success) {
        setError(result.error || 'Authentication failed');
        setPin(''); // Clear PIN on failure
      } else {
        console.log('🎉 Login successful!');
        // PIN will be cleared by navigation
      }
    } catch (error) {
      console.error('🚨 Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      setPin(''); // Clear PIN on error
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (newPin) => {
    setPin(newPin);
    // Clear error when user starts typing
    if (error && newPin.length > 0) {
      setError('');
    }
    // Auto-submit when 4 digits are entered
    if (newPin.length === 4) {
      handlePinComplete(newPin);
    }
  };

  const getLockoutMessage = () => {
    if (!lockoutTime || Date.now() >= lockoutTime) return null;
    
    const remainingTime = Math.ceil((lockoutTime - Date.now()) / 1000 / 60);
    return `Account locked. Try again in ${remainingTime} minutes.`;
  };

  const lockoutMessage = getLockoutMessage();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="security" size={64} color="#ffffff" />
            <Text style={styles.logoText}>SAMS</Text>
          </View>
          <Text style={styles.subtitle}>
            Server Alert Management System
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {lockoutMessage ? (
            <View style={styles.lockoutContainer}>
              <Icon name="lock" size={48} color="#ef4444" />
              <Text style={styles.lockoutTitle}>Account Locked</Text>
              <Text style={styles.lockoutMessage}>{lockoutMessage}</Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.pinInput, error ? styles.pinInputError : null]}
                value={pin}
                onChangeText={handlePinChange}
                placeholder="Enter 4-digit PIN (Default: 1234)"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry={true}
                editable={!isLoading}
                onSubmitEditing={() => handlePinComplete(pin)}
                autoFocus={true}
              />

              {/* Error Display */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Icon name="error" size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Loading Display */}
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <Icon name="hourglass-empty" size={24} color="#1e3a8a" />
                  <Text style={styles.loadingText}>🔐 Authenticating...</Text>
                </View>
              )}

              {/* Demo Instructions */}
              {!isLoading && !error && (
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsTitle}>🔐 Demo Login</Text>
                  <Text style={styles.instructionsText}>Use PIN: 1234</Text>
                  <Text style={styles.instructionsSubtext}>
                    This will log you in as System Administrator with full access to all enterprise features.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secure access to server monitoring and management
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#93c5fd',
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  lockoutContainer: {
    alignItems: 'center',
    padding: 40,
  },
  lockoutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  lockoutMessage: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
  },
  pinInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#1e3a8a',
    marginLeft: 12,
    fontWeight: '500',
  },
  pinInputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  instructionsContainer: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0c4a6e',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsSubtext: {
    fontSize: 12,
    color: '#0369a1',
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#93c5fd',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default LoginScreen; 