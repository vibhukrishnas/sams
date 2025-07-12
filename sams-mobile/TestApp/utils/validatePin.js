import AsyncStorage from '@react-native-async-storage/async-storage';

// Default PIN for development/testing
const DEFAULT_PIN = '1234';

/**
 * 🔥 BULLETPROOF PIN VALIDATION WITH BACKEND VERIFICATION
 * Validates user PIN with multiple authentication methods
 */
export const validatePin = async (pin) => {
  try {
    console.log('🔍 Validating PIN:', pin);

    // Check if PIN is provided
    if (!pin || pin.trim() === '') {
      console.log('❌ Empty PIN provided');
      return false;
    }

    // Check if PIN is exactly 4 digits
    if (!/^\d{4}$/.test(pin)) {
      console.log('❌ PIN format invalid - must be 4 digits');
      return false;
    }

    // 🔥 BACKEND AUTHENTICATION - Connect to your Windows server
    try {
      const authEndpoint = 'http://192.168.1.10:8080/api/v1/auth/validate';
      console.log('🌐 Authenticating with backend server...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ pin: pin }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend authentication successful');
        return result.valid === true;
      }
    } catch (backendError) {
      console.log('⚠️ Backend authentication failed, using fallback:', backendError.message);
    }

    // 🔥 FALLBACK AUTHENTICATION - Local validation
    if (pin === DEFAULT_PIN) {
      console.log('✅ Default PIN accepted (fallback)');
      return true;
    }

    // Check against stored custom PIN
    try {
      const storedPin = await AsyncStorage.getItem('userPin');
      if (storedPin && pin === storedPin) {
        console.log('✅ Custom PIN accepted');
        return true;
      }
    } catch (storageError) {
      console.log('⚠️ Storage error, falling back to default PIN');
    }

    // Additional demo PINs for testing
    const demoPins = ['1234', '0000', '1111', '2222'];
    if (demoPins.includes(pin)) {
      console.log('✅ Demo PIN accepted');
      return true;
    }

    console.log('❌ PIN validation failed');
    return false;
  } catch (error) {
    console.error('🚨 Error validating PIN:', error);
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