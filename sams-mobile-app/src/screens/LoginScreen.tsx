import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../theme/theme';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  const correctPin = '1234';

  const handlePinChange = (value: string, index: number) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);

      // Auto-focus next input
      if (value && index < 3) {
        const nextInput = `pin${index + 1}`;
        // You would typically use a ref here to focus the next input
      }

      // Auto-login when all pins are filled
      if (newPin.every(digit => digit !== '') && newPin.join('') === correctPin) {
        handleLogin(newPin.join(''));
      }
    }
  };

  const handleLogin = async (enteredPin: string) => {
    setIsLoading(true);
    
    try {
      if (enteredPin === correctPin) {
        setTimeout(() => {
          setIsLoading(false);
          onLogin();
        }, 1000);
      } else {
        setTimeout(() => {
          setIsLoading(false);
          Alert.alert('Invalid PIN', 'Please enter the correct 4-digit PIN.');
          setPin(['', '', '', '']);
        }, 1000);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Login failed. Please try again.');
    }
  };

  const handleManualLogin = () => {
    const enteredPin = pin.join('');
    if (enteredPin.length === 4) {
      handleLogin(enteredPin);
    } else {
      Alert.alert('Incomplete PIN', 'Please enter all 4 digits.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Icon name="security" size={80} color={colors.primary} />
              </View>
              <Text style={styles.title}>SAMS</Text>
              <Text style={styles.subtitle}>System Administration & Monitoring Suite</Text>
              <Text style={styles.description}>
                Enter your 4-digit PIN to access the mobile dashboard
              </Text>
            </View>

            {/* PIN Input Section */}
            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>Enter PIN</Text>
              <View style={styles.pinContainer}>
                {pin.map((digit, index) => (
                  <TextInput
                    key={index}
                    style={[
                      styles.pinInput,
                      digit ? styles.pinInputFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(value) => handlePinChange(value, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    secureTextEntry
                    textAlign="center"
                    editable={!isLoading}
                  />
                ))}
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleManualLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[colors.primary, '#2563eb']}
                  style={styles.loginButtonGradient}
                >
                  {isLoading ? (
                    <Text style={styles.loginButtonText}>Authenticating...</Text>
                  ) : (
                    <>
                      <Icon name="login" size={20} color="#ffffff" />
                      <Text style={styles.loginButtonText}>Access Dashboard</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Secure mobile access to your SAMS infrastructure
              </Text>
              <View style={styles.statusIndicator}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>System Online</Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: height * 0.1,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
  },
  title: {
    ...typography.heading1,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  pinSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  pinLabel: {
    ...typography.heading3,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width * 0.6,
    marginBottom: spacing.xl,
  },
  pinInput: {
    width: 55,
    height: 65,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  pinInputFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  loginButton: {
    width: width * 0.7,
    height: 55,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '500',
  },
});

export default LoginScreen;
