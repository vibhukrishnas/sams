import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  showClearButton?: boolean;
  showSearchButton?: boolean;
  disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  style,
  autoFocus = false,
  onFocus,
  onBlur,
  onSubmit,
  showClearButton = true,
  showSearchButton = true,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    inputRef.current?.blur();
    onSubmit?.();
  };

  const borderColor = focusAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e0e0e0', '#1976D2'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {showSearchButton && (
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSubmit}
          disabled={disabled}
        >
          <Icon
            name="search"
            size={20}
            color={isFocused ? '#1976D2' : '#666'}
          />
        </TouchableOpacity>
      )}

      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          disabled && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        autoFocus={autoFocus}
        editable={!disabled}
        returnKeyType="search"
        clearButtonMode="never" // We'll handle this manually
      />

      {showClearButton && value.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          disabled={disabled}
        >
          <Icon
            name="clear"
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 44,
  },
  disabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
  },
  searchButton: {
    marginRight: 8,
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0, // Remove default padding
  },
  inputDisabled: {
    color: '#999',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default SearchBar;
