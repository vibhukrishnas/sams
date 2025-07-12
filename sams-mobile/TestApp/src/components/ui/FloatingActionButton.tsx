import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HapticFeedback from 'react-native-haptic-feedback';

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  style?: ViewStyle;
  backgroundColor?: string;
  iconColor?: string;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  pulse?: boolean;
  badge?: number;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  style,
  backgroundColor = '#1976D2',
  iconColor = '#fff',
  size = 56,
  iconSize = 24,
  disabled = false,
  pulse = false,
  badge,
}) => {
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [pulse]);

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

  const stopPulseAnimation = () => {
    pulseAnimation.stopAnimation();
    Animated.timing(pulseAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = () => {
    if (!disabled) {
      HapticFeedback.trigger('impactLight');
      Animated.spring(scaleAnimation, {
        toValue: 0.9,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.spring(scaleAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (!disabled) {
      HapticFeedback.trigger('impactMedium');
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: scaleAnimation },
            { scale: pulseAnimation },
          ],
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: disabled ? '#ccc' : backgroundColor,
          },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Icon
          name={icon}
          size={iconSize}
          color={disabled ? '#999' : iconColor}
        />
        
        {badge !== undefined && badge > 0 && (
          <Animated.View style={styles.badge}>
            <Animated.Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge.toString()}
            </Animated.Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default FloatingActionButton;
