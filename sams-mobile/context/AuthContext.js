import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {validatePin} from '../../utils/validatePin';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({children}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated on app start
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');
      const lockout = await AsyncStorage.getItem('lockoutTime');

      if (lockout) {
        const lockoutTimestamp = parseInt(lockout);
        const now = Date.now();
        if (now < lockoutTimestamp) {
          setLockoutTime(lockoutTimestamp);
        } else {
          await AsyncStorage.removeItem('lockoutTime');
          setLockoutTime(null);
        }
      }

      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (pin) => {
    try {
      // Check if account is locked
      if (lockoutTime && Date.now() < lockoutTime) {
        const remainingTime = Math.ceil((lockoutTime - Date.now()) / 1000 / 60);
        throw new Error(`Account is locked. Try again in ${remainingTime} minutes.`);
      }

      // Validate PIN
      const isValid = await validatePin(pin);
      
      if (isValid) {
        // Reset login attempts on successful login
        setLoginAttempts(0);
        await AsyncStorage.removeItem('loginAttempts');
        await AsyncStorage.removeItem('lockoutTime');
        setLockoutTime(null);

        // Create mock user data
        const userData = {
          id: '1',
          name: 'System Administrator',
          role: 'admin',
          email: 'admin@sams.com',
          lastLogin: new Date().toISOString(),
        };

        // Store authentication data
        await AsyncStorage.setItem('authToken', 'mock-jwt-token');
        await AsyncStorage.setItem('userData', JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        return {success: true};
      } else {
        // Increment login attempts
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        await AsyncStorage.setItem('loginAttempts', newAttempts.toString());

        // Lock account after 5 failed attempts
        if (newAttempts >= 5) {
          const lockoutDuration = 15 * 60 * 1000; // 15 minutes
          const lockoutTimestamp = Date.now() + lockoutDuration;
          await AsyncStorage.setItem('lockoutTime', lockoutTimestamp.toString());
          setLockoutTime(lockoutTimestamp);
          throw new Error('Too many failed attempts. Account locked for 15 minutes.');
        }

        const remainingAttempts = 5 - newAttempts;
        throw new Error(`Invalid PIN. ${remainingAttempts} attempts remaining.`);
      }
    } catch (error) {
      return {success: false, error: error.message};
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUser = async (userData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    loginAttempts,
    lockoutTime,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 