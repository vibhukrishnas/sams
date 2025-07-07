import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PinInput = ({onPinComplete, onPinChange, error, disabled}) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (error) {
      // Clear PIN on error
      setPin(['', '', '', '']);
      setFocusedIndex(0);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  }, [error]);

  const handlePinChange = (text, index) => {
    if (disabled) return;

    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);

    // Call onPinChange callback
    if (onPinChange) {
      onPinChange(newPin.join(''));
    }

    // Auto-focus next input
    if (text && index < 3) {
      setFocusedIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }

    // Check if PIN is complete
    if (newPin.every(digit => digit !== '')) {
      const completePin = newPin.join('');
      if (onPinComplete) {
        onPinComplete(completePin);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      setFocusedIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleInputFocus = (index) => {
    setFocusedIndex(index);
  };

  const clearPin = () => {
    setPin(['', '', '', '']);
    setFocusedIndex(0);
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  };

  const renderPinInput = (index) => {
    const isFocused = focusedIndex === index;
    const hasValue = pin[index] !== '';
    const isError = error && hasValue;

    return (
      <View
        key={index}
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          isError && styles.inputError,
        ]}>
        <TextInput
          ref={(ref) => (inputRefs.current[index] = ref)}
          style={styles.input}
          value={pin[index]}
          onChangeText={(text) => handlePinChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => handleInputFocus(index)}
          keyboardType="numeric"
          maxLength={1}
          secureTextEntry={false}
          editable={!disabled}
          selectTextOnFocus
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {hasValue && (
          <Icon
            name="fiber-manual-record"
            size={12}
            color={isError ? '#ef4444' : '#1e3a8a'}
            style={styles.dot}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter 4-Digit PIN</Text>
      <Text style={styles.subtitle}>
        Enter your secure PIN to access the system
      </Text>
      
      <View style={styles.pinContainer}>
        {pin.map((_, index) => renderPinInput(index))}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="error" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.clearButton}
        onPress={clearPin}
        disabled={disabled}>
        <Icon name="clear" size={20} color="#6b7280" />
        <Text style={styles.clearButtonText}>Clear PIN</Text>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Icon name="info" size={16} color="#6b7280" />
        <Text style={styles.infoText}>
          PIN is required for system access. Keep it secure.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  inputFocused: {
    borderColor: '#1e3a8a',
    borderWidth: 3,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 3,
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  dot: {
    position: 'absolute',
    bottom: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
  },
  clearButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    maxWidth: 300,
  },
  infoText: {
    color: '#1e40af',
    fontSize: 12,
    marginLeft: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PinInput; 