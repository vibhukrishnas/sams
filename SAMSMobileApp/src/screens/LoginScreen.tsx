import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    
    // Simulate authentication (replace with actual API call)
    setTimeout(() => {
      if (pin === '1234' || pin === '0000' || pin === '1111') {
        onLogin();
      } else {
        Alert.alert('Authentication Failed', 'Invalid PIN. Try 1234, 0000, or 1111');
      }
      setLoading(false);
    }, 1000);
  };

  const handlePinChange = (text: string) => {
    // Only allow digits and limit to 4 characters
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericText);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      
      <View style={styles.logoContainer}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>SAMS</Text>
        </View>
        <Text style={styles.title}>Strategic Asset Management System</Text>
        <Text style={styles.subtitle}>Mobile Dashboard</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.pinLabel}>Enter 4-Digit PIN</Text>
        
        <View style={styles.pinContainer}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={styles.pinDigit}>
              <Text style={styles.pinDigitText}>
                {pin[index] ? '●' : ''}
              </Text>
            </View>
          ))}
        </View>

        <TextInput
          style={styles.hiddenInput}
          value={pin}
          onChangeText={handlePinChange}
          keyboardType="numeric"
          secureTextEntry={false}
          maxLength={4}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.loginButton, { opacity: pin.length === 4 ? 1 : 0.5 }]}
          onPress={handleLogin}
          disabled={pin.length !== 4 || loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Authenticating...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setPin('')}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
        <Text style={styles.footerText}>© 2025 SAMS Mobile</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#4a90e2',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  pinLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 30,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  pinDigit: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  pinDigitText: {
    fontSize: 24,
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  loginButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 10,
    paddingVertical: 15,
    marginBottom: 15,
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingVertical: 15,
  },
  clearButtonText: {
    color: '#7f8c8d',
    textAlign: 'center',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#95a5a6',
    fontSize: 12,
    marginVertical: 2,
  },
});

export default LoginScreen;
