import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppDispatch } from '../../store/hooks';
import { updateBiometric } from '../../store/slices/authSlice';
import AuthenticationService from '../../services/AuthenticationService';
import { getTheme } from '../../theme';

interface Props {
  navigation: any;
}

const BiometricSetupScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const theme = getTheme(false);

  const [biometricType, setBiometricType] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const available = await AuthenticationService.isBiometricAvailable();
      const type = await AuthenticationService.getBiometricType();
      
      setIsAvailable(available);
      setBiometricType(type);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  };

  const handleEnableBiometric = async () => {
    setIsLoading(true);
    try {
      const success = await AuthenticationService.enableBiometric();
      
      if (success) {
        dispatch(updateBiometric({ hasBiometric: true, biometricType }));
        
        Alert.alert(
          'Success',
          `${biometricType} has been enabled successfully!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Main'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to enable ${biometricType}. Please try again.`
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `An error occurred while setting up ${biometricType}.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Biometric Setup',
      'You can enable biometric authentication later in settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => navigation.navigate('Main'),
        },
      ]
    );
  };

  const getBiometricIcon = () => {
    switch (biometricType.toLowerCase()) {
      case 'face id':
      case 'face':
        return 'face';
      case 'touch id':
      case 'fingerprint':
        return 'fingerprint';
      default:
        return 'security';
    }
  };

  const getBiometricDescription = () => {
    switch (biometricType.toLowerCase()) {
      case 'face id':
      case 'face':
        return 'Use Face ID to quickly and securely access your account';
      case 'touch id':
      case 'fingerprint':
        return 'Use your fingerprint to quickly and securely access your account';
      default:
        return 'Use biometric authentication to quickly and securely access your account';
    }
  };

  if (!isAvailable) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
        
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Biometric Setup
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="security" size={80} color={theme.colors.textSecondary} />
          </View>
          
          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            Biometric Authentication Not Available
          </Text>
          
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Your device doesn't support biometric authentication or it's not set up.
            You can still use PIN authentication to secure your account.
          </Text>

          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Enable {biometricType}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon 
            name={getBiometricIcon()} 
            size={80} 
            color={theme.colors.primary} 
          />
        </View>
        
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          Secure & Convenient
        </Text>
        
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {getBiometricDescription()}
        </Text>

        <TouchableOpacity
          style={[
            styles.enableButton,
            { 
              backgroundColor: theme.colors.primary,
              opacity: isLoading ? 0.7 : 1,
            }
          ]}
          onPress={handleEnableBiometric}
          disabled={isLoading}
        >
          <Text style={styles.enableButtonText}>
            {isLoading ? 'Setting up...' : `Enable ${biometricType}`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  enableButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 200,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
  },
});

export default BiometricSetupScreen;
