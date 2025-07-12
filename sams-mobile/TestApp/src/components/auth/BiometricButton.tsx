import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface BiometricButtonProps {
  onPress: () => void;
  style?: any;
  disabled?: boolean;
  type?: 'fingerprint' | 'face' | 'auto';
}

const BiometricButton: React.FC<BiometricButtonProps> = ({
  onPress,
  style,
  disabled = false,
  type = 'auto',
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const getBiometricIcon = () => {
    if (type === 'face') return 'face';
    if (type === 'fingerprint') return 'fingerprint';
    
    // Auto-detect based on platform
    return Platform.OS === 'ios' ? 'face' : 'fingerprint';
  };

  const getBiometricLabel = () => {
    if (type === 'face') return 'Face ID';
    if (type === 'fingerprint') return 'Touch ID';
    
    // Auto-detect based on platform
    return Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint';
  };

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnimation, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  React.useEffect(() => {
    startPulseAnimation();
  }, []);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [
              { scale: scaleAnimation },
              { scale: pulseAnimation },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            disabled && styles.buttonDisabled,
            isPressed && styles.buttonPressed,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Icon
              name={getBiometricIcon()}
              size={48}
              color={disabled ? '#999' : '#fff'}
            />
          </View>
          
          <View style={styles.rippleContainer}>
            <View style={[styles.ripple, styles.ripple1]} />
            <View style={[styles.ripple, styles.ripple2]} />
            <View style={[styles.ripple, styles.ripple3]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {getBiometricLabel()}
      </Text>
      
      <Text style={[styles.instruction, disabled && styles.instructionDisabled]}>
        Tap to authenticate
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  buttonContainer: {
    position: 'relative',
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    zIndex: 2,
  },
  rippleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ripple1: {
    width: 140,
    height: 140,
  },
  ripple2: {
    width: 160,
    height: 160,
  },
  ripple3: {
    width: 180,
    height: 180,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  labelDisabled: {
    color: '#999',
  },
  instruction: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  instructionDisabled: {
    color: '#666',
  },
});

export default BiometricButton;
