import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import HapticService from '../../services/HapticService';

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  icon?: string;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  showArrow?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  subtitle,
  icon,
  rightComponent,
  onPress,
  showArrow = false,
  disabled = false,
  style,
  testID,
}) => {
  const { theme } = useTheme();

  const handlePress = () => {
    if (!disabled && onPress) {
      HapticService.buttonPress();
      onPress();
    }
  };

  const ItemContent = () => (
    <View style={[
      styles.container,
      { backgroundColor: theme.colors.surface },
      disabled && styles.disabled,
      style,
    ]}>
      <View style={styles.leftSection}>
        {icon && (
          <View style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.primary + '20' }
          ]}>
            <Icon
              name={icon}
              size={20}
              color={disabled ? theme.colors.textDisabled : theme.colors.primary}
            />
          </View>
        )}
        
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            { color: disabled ? theme.colors.textDisabled : theme.colors.text }
          ]}>
            {title}
          </Text>
          
          {subtitle && (
            <Text style={[
              styles.subtitle,
              { color: disabled ? theme.colors.textDisabled : theme.colors.textSecondary }
            ]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.rightSection}>
        {rightComponent}
        
        {showArrow && (
          <Icon
            name="chevron-right"
            size={20}
            color={disabled ? theme.colors.textDisabled : theme.colors.textSecondary}
            style={styles.arrow}
          />
        )}
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
      >
        <ItemContent />
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID}>
      <ItemContent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  disabled: {
    opacity: 0.5,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    marginLeft: 8,
  },
});

export default SettingsItem;
