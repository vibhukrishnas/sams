import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface PinInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onComplete: (pin: string) => void;
  length?: number;
  secureTextEntry?: boolean;
  style?: any;
  autoFocus?: boolean;
  editable?: boolean;
}

const PinInput: React.FC<PinInputProps> = ({
  value,
  onChangeText,
  onComplete,
  length = 4,
  secureTextEntry = true,
  style,
  autoFocus = true,
  editable = true,
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value.length === length) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleTextChange = (text: string) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    
    // Limit to specified length
    if (numericText.length <= length) {
      onChangeText(numericText);
    }
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const shake = () => {
    Vibration.vibrate(100);
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
  };

  const renderPinDots = () => {
    const dots = [];
    
    for (let i = 0; i < length; i++) {
      const isFilled = i < value.length;
      const isActive = i === value.length && focused;
      
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            isFilled && styles.pinDotFilled,
            isActive && styles.pinDotActive,
          ]}
        >
          {isFilled && secureTextEntry && (
            <View style={styles.pinDotInner} />
          )}
          {isFilled && !secureTextEntry && (
            <Text style={styles.pinDigit}>{value[i]}</Text>
          )}
        </View>
      );
    }
    
    return dots;
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['clear', '0', 'backspace'],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.keypadButton,
                  (key === 'clear' || key === 'backspace') && styles.keypadButtonSpecial,
                ]}
                onPress={() => handleKeyPress(key)}
                disabled={!editable}
              >
                {key === 'backspace' ? (
                  <Icon name="backspace" size={24} color="#333" />
                ) : key === 'clear' ? (
                  <Icon name="clear" size={24} color="#666" />
                ) : (
                  <Text style={styles.keypadButtonText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const handleKeyPress = (key: string) => {
    if (!editable) return;

    if (key === 'backspace') {
      onChangeText(value.slice(0, -1));
    } else if (key === 'clear') {
      onChangeText('');
    } else if (value.length < length) {
      onChangeText(value + key);
    }
  };

  // Expose shake method for parent components
  React.useImperativeHandle(inputRef, () => ({
    shake,
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        { transform: [{ translateX: shakeAnimation }] },
      ]}
    >
      {/* Hidden TextInput for system keyboard */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="numeric"
        maxLength={length}
        secureTextEntry={secureTextEntry}
        autoFocus={autoFocus}
        editable={editable}
        style={styles.hiddenInput}
        caretHidden
      />
      
      {/* PIN Dots Display */}
      <TouchableOpacity
        style={styles.pinContainer}
        onPress={() => inputRef.current?.focus()}
        activeOpacity={0.7}
      >
        {renderPinDots()}
      </TouchableOpacity>
      
      {/* Custom Keypad */}
      {renderKeypad()}
      
      {/* Clear Button */}
      {value.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotFilled: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  pinDotActive: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pinDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1976D2',
  },
  pinDigit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  keypad: {
    marginTop: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  keypadButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  keypadButtonSpecial: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default PinInput;
