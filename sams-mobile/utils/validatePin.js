import AsyncStorage from '@react-native-async-storage/async-storage';

// Default PIN for development/testing
const DEFAULT_PIN = '1234';

export const validatePin = async (pin) => {
  try {
    // For now, we'll use a simple validation
    // In a real app, this would validate against a secure backend
    
    // Check if PIN is exactly 4 digits
    if (!/^\d{4}$/.test(pin)) {
      return false;
    }

    // For development purposes, accept the default PIN
    // In production, this would be replaced with API call
    if (pin === DEFAULT_PIN) {
      return true;
    }

    // You can add more validation logic here
    // For example, checking against stored PIN hash
    
    return false;
  } catch (error) {
    console.error('Error validating PIN:', error);
    return false;
  }
};

export const setPin = async (newPin) => {
  try {
    // In a real app, this would hash the PIN before storing
    await AsyncStorage.setItem('userPin', newPin);
    return true;
  } catch (error) {
    console.error('Error setting PIN:', error);
    return false;
  }
};

export const getStoredPin = async () => {
  try {
    return await AsyncStorage.getItem('userPin');
  } catch (error) {
    console.error('Error getting stored PIN:', error);
    return null;
  }
};

export const clearStoredPin = async () => {
  try {
    await AsyncStorage.removeItem('userPin');
    return true;
  } catch (error) {
    console.error('Error clearing stored PIN:', error);
    return false;
  }
}; 