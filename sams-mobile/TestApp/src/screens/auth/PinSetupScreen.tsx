import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppDispatch } from '../../store/hooks';
import { updatePin } from '../../store/slices/authSlice';
import AuthenticationService from '../../services/AuthenticationService';
import { getTheme } from '../../theme';

interface Props {
  navigation: any;
  route?: {
    params?: {
      isSetup?: boolean;
    };
  };
}

const PinSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const theme = getTheme(false);
  const isSetup = route?.params?.isSetup || false;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [isLoading, setIsLoading] = useState(false);

  const handleNumberPress = (number: string) => {
    if (step === 'enter') {
      if (pin.length < 4) {
        setPin(pin + number);
      }
    } else {
      if (confirmPin.length < 4) {
        setConfirmPin(confirmPin + number);
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleContinue = async () => {
    if (step === 'enter' && pin.length === 4) {
      setStep('confirm');
    } else if (step === 'confirm' && confirmPin.length === 4) {
      if (pin === confirmPin) {
        await setupPin();
      } else {
        Alert.alert('Error', 'PINs do not match. Please try again.');
        setPin('');
        setConfirmPin('');
        setStep('enter');
      }
    }
  };

  const setupPin = async () => {
    setIsLoading(true);
    try {
      await AuthenticationService.setupPin(pin);
      dispatch(updatePin({ hasPin: true }));
      
      Alert.alert(
        'Success',
        'PIN has been set up successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (isSetup) {
                navigation.navigate('BiometricSetup');
              } else {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to set up PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPinDots = (currentPin: string) => {
    return (
      <View style={styles.pinContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              currentPin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.numberButton,
                  item === '' && styles.emptyButton,
                ]}
                onPress={() => {
                  if (item === 'backspace') {
                    handleBackspace();
                  } else if (item !== '') {
                    handleNumberPress(item);
                  }
                }}
                disabled={item === '' || isLoading}
              >
                {item === 'backspace' ? (
                  <Icon name="backspace" size={24} color={theme.colors.text} />
                ) : (
                  <Text style={[styles.numberText, { color: theme.colors.text }]}>
                    {item}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

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
          {step === 'enter' ? 'Set up PIN' : 'Confirm PIN'}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {step === 'enter'
            ? 'Enter a 4-digit PIN to secure your account'
            : 'Re-enter your PIN to confirm'}
        </Text>

        {renderPinDots(step === 'enter' ? pin : confirmPin)}
        {renderNumberPad()}

        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: 
                (step === 'enter' && pin.length === 4) ||
                (step === 'confirm' && confirmPin.length === 4)
                  ? 1
                  : 0.5,
            },
          ]}
          onPress={handleContinue}
          disabled={
            isLoading ||
            (step === 'enter' && pin.length !== 4) ||
            (step === 'confirm' && confirmPin.length !== 4)
          }
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Setting up...' : 'Continue'}
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
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  pinDotFilled: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  numberPad: {
    alignItems: 'center',
    marginBottom: 40,
  },
  numberRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  numberButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#F5F5F5',
  },
  emptyButton: {
    backgroundColor: 'transparent',
  },
  numberText: {
    fontSize: 24,
    fontWeight: '600',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PinSetupScreen;
