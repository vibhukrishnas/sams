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

    setIsLoading(true);
    setError('');

    try {
      const result = await login(pin);
      
      if (!result.success) {
        setError(result.error);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
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
                style={styles.pinInput}
                value={pin}
                onChangeText={handlePinChange}
                placeholder="Enter 4-digit PIN (1234)"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry={true}
                editable={!isLoading}
                onSubmitEditing={() => handlePinComplete(pin)}
              />

              {isLoading && (
                <View style={styles.loadingContainer}>
                  <Icon name="hourglass-empty" size={24} color="#1e3a8a" />
                  <Text style={styles.loadingText}>Authenticating...</Text>
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