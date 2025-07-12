import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import EnhancedAuthService from '../../services/EnhancedAuthService';
import PinInput from '../../components/auth/PinInput';
import BiometricButton from '../../components/auth/BiometricButton';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

interface EnhancedLoginScreenProps {}

const EnhancedLoginScreen: React.FC<EnhancedLoginScreenProps> = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(state => state.auth);
  
  const [authMode, setAuthMode] = useState<'pin' | 'biometric' | 'password'>('pin');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  useEffect(() => {
    checkAuthMethods();
  }, []);

  const checkAuthMethods = async () => {
    try {
      const biometricAvail = await EnhancedAuthService.isBiometricAvailable();
      setBiometricAvailable(biometricAvail);
      
      // Check if PIN is enabled
      const pinEnabledStatus = await AsyncStorage.getItem('pin_enabled');
      setPinEnabled(pinEnabledStatus === 'true');
      
      // Set default auth mode
      if (biometricAvail) {
        setAuthMode('biometric');
      } else if (pinEnabledStatus === 'true') {
        setAuthMode('pin');
      } else {
        setAuthMode('password');
      }
    } catch (error) {
      console.error('Error checking auth methods:', error);
    }
  };

  const handlePinComplete = async (enteredPin: string) => {
    try {
      const result = await EnhancedAuthService.validatePin(enteredPin);
      if (result.success) {
        navigation.navigate('Main' as never);
      } else {
        setPin('');
        Toast.show({
          type: 'error',
          text1: 'Authentication Failed',
          text2: result.error || 'Invalid PIN',
        });
      }
    } catch (error) {
      console.error('PIN authentication error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Authentication failed. Please try again.',
      });
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await EnhancedAuthService.authenticateWithBiometrics();
      if (result.success) {
        navigation.navigate('Main' as never);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Biometric Authentication Failed',
          text2: result.error || 'Please try again',
        });
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Biometric authentication failed',
      });
    }
  };

  const handlePasswordLogin = () => {
    navigation.navigate('Login' as never);
  };

  const renderAuthMethod = () => {
    switch (authMode) {
      case 'pin':
        return (
          <View style={styles.authContainer}>
            <Text style={styles.title}>Enter Your PIN</Text>
            <Text style={styles.subtitle}>Enter your 4-digit PIN to access SAMS</Text>
            
            <PinInput
              value={pin}
              onChangeText={setPin}
              onComplete={handlePinComplete}
              length={4}
              secureTextEntry={!showPin}
              style={styles.pinInput}
            />
            
            <TouchableOpacity
              style={styles.showPinButton}
              onPress={() => setShowPin(!showPin)}
            >
              <Icon 
                name={showPin ? 'visibility-off' : 'visibility'} 
                size={20} 
                color="#666" 
              />
              <Text style={styles.showPinText}>
                {showPin ? 'Hide PIN' : 'Show PIN'}
              </Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'biometric':
        return (
          <View style={styles.authContainer}>
            <Text style={styles.title}>Biometric Authentication</Text>
            <Text style={styles.subtitle}>Use your fingerprint or face to access SAMS</Text>
            
            <BiometricButton
              onPress={handleBiometricAuth}
              style={styles.biometricButton}
            />
          </View>
        );
        
      default:
        return (
          <View style={styles.authContainer}>
            <Text style={styles.title}>Welcome to SAMS</Text>
            <Text style={styles.subtitle}>Server Alert Management System</Text>
            
            <TouchableOpacity
              style={styles.passwordButton}
              onPress={handlePasswordLogin}
            >
              <Icon name="login" size={20} color="#fff" />
              <Text style={styles.passwordButtonText}>Login with Password</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  const renderAuthModeSelector = () => {
    const modes = [];
    
    if (pinEnabled) {
      modes.push({ key: 'pin', label: 'PIN', icon: 'pin' });
    }
    
    if (biometricAvailable) {
      modes.push({ key: 'biometric', label: 'Biometric', icon: 'fingerprint' });
    }
    
    modes.push({ key: 'password', label: 'Password', icon: 'password' });
    
    if (modes.length <= 1) return null;
    
    return (
      <View style={styles.authModeSelector}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[
              styles.authModeButton,
              authMode === mode.key && styles.authModeButtonActive
            ]}
            onPress={() => setAuthMode(mode.key as any)}
          >
            <Icon 
              name={mode.icon} 
              size={20} 
              color={authMode === mode.key ? '#1976D2' : '#666'} 
            />
            <Text style={[
              styles.authModeText,
              authMode === mode.key && styles.authModeTextActive
            ]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      <LinearGradient
        colors={['#1976D2', '#1565C0', '#0D47A1']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View style={styles.header}>
            <Icon name="security" size={60} color="#fff" />
            <Text style={styles.appName}>SAMS Mobile</Text>
            <Text style={styles.appTagline}>Secure Server Monitoring</Text>
          </View>
          
          <View style={styles.content}>
            {renderAuthModeSelector()}
            {renderAuthMethod()}
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Secure • Reliable • Enterprise-Grade
            </Text>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
      
      {isLoading && <LoadingOverlay />}
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  appTagline: {
    fontSize: 16,
    color: '#E3F2FD',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  authModeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  authModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  authModeButtonActive: {
    backgroundColor: '#fff',
  },
  authModeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#E3F2FD',
  },
  authModeTextActive: {
    color: '#1976D2',
    fontWeight: '600',
  },
  authContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    textAlign: 'center',
    marginBottom: 32,
  },
  pinInput: {
    marginBottom: 16,
  },
  showPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  showPinText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#E3F2FD',
  },
  biometricButton: {
    marginTop: 20,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  passwordButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#E3F2FD',
  },
});

export default EnhancedLoginScreen;
