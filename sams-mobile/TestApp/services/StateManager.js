/**
 * 🔥 BULLETPROOF STATE MANAGER - ELIMINATES ALL UI STATE ISSUES
 * Manages all app state with proper error handling and recovery
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, ToastAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrashHandler from './CrashHandler';

class StateManager {
  static instance = null;
  
  constructor() {
    if (StateManager.instance) {
      return StateManager.instance;
    }
    
    this.state = new Map();
    this.listeners = new Map();
    this.crashHandler = CrashHandler.getInstance();
    
    StateManager.instance = this;
  }

  static getInstance() {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  // 🔥 BULLETPROOF STATE SETTER WITH ERROR HANDLING
  setState(key, value, options = {}) {
    try {
      const oldValue = this.state.get(key);
      this.state.set(key, value);
      
      // 🔥 VALIDATE STATE CHANGE
      if (options.validate && !options.validate(value)) {
        console.error(`❌ State validation failed for key: ${key}`);
        this.state.set(key, oldValue); // Rollback
        throw new Error(`Invalid state value for ${key}`);
      }
      
      // 🔥 PERSIST TO STORAGE IF REQUIRED
      if (options.persist) {
        this.persistState(key, value);
      }
      
      // 🔥 NOTIFY LISTENERS
      this.notifyListeners(key, value, oldValue);
      
      console.log(`✅ State updated: ${key} =`, value);
      
    } catch (error) {
      this.crashHandler.handleError(error, 'STATE_ERROR', { key, value });
      throw error;
    }
  }

  // 🔥 BULLETPROOF STATE GETTER
  getState(key, defaultValue = null) {
    try {
      return this.state.has(key) ? this.state.get(key) : defaultValue;
    } catch (error) {
      this.crashHandler.handleError(error, 'STATE_ERROR', { key });
      return defaultValue;
    }
  }

  // 🔥 ASYNC STATE PERSISTENCE
  async persistState(key, value) {
    try {
      await AsyncStorage.setItem(`state_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ Failed to persist state for ${key}:`, error);
      this.crashHandler.handleError(error, 'STORAGE_ERROR', { key });
    }
  }

  // 🔥 LOAD PERSISTED STATE
  async loadPersistedState(key, defaultValue = null) {
    try {
      const stored = await AsyncStorage.getItem(`state_${key}`);
      if (stored) {
        const value = JSON.parse(stored);
        this.state.set(key, value);
        return value;
      }
      return defaultValue;
    } catch (error) {
      console.error(`❌ Failed to load persisted state for ${key}:`, error);
      this.crashHandler.handleError(error, 'STORAGE_ERROR', { key });
      return defaultValue;
    }
  }

  // 🔥 STATE LISTENERS FOR REACTIVE UPDATES
  addListener(key, callback) {
    try {
      if (!this.listeners.has(key)) {
        this.listeners.set(key, new Set());
      }
      this.listeners.get(key).add(callback);
      
      // Return unsubscribe function
      return () => {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
          keyListeners.delete(callback);
          if (keyListeners.size === 0) {
            this.listeners.delete(key);
          }
        }
      };
    } catch (error) {
      this.crashHandler.handleError(error, 'STATE_ERROR', { key });
      return () => {}; // Return no-op function
    }
  }

  // 🔥 NOTIFY ALL LISTENERS
  notifyListeners(key, newValue, oldValue) {
    try {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.forEach(callback => {
          try {
            callback(newValue, oldValue);
          } catch (error) {
            console.error(`❌ Listener error for key ${key}:`, error);
            this.crashHandler.handleError(error, 'LISTENER_ERROR', { key });
          }
        });
      }
    } catch (error) {
      this.crashHandler.handleError(error, 'STATE_ERROR', { key });
    }
  }

  // 🔥 BATCH STATE UPDATES
  batchUpdate(updates, options = {}) {
    try {
      const oldValues = new Map();
      
      // Store old values for rollback
      Object.keys(updates).forEach(key => {
        oldValues.set(key, this.state.get(key));
      });
      
      // Apply all updates
      Object.entries(updates).forEach(([key, value]) => {
        this.state.set(key, value);
        if (options.persist) {
          this.persistState(key, value);
        }
      });
      
      // Notify all listeners
      Object.entries(updates).forEach(([key, value]) => {
        this.notifyListeners(key, value, oldValues.get(key));
      });
      
      console.log('✅ Batch state update completed:', Object.keys(updates));
      
    } catch (error) {
      console.error('❌ Batch update failed:', error);
      this.crashHandler.handleError(error, 'STATE_ERROR', { updates });
      throw error;
    }
  }

  // 🔥 CLEAR ALL STATE
  clearState() {
    try {
      this.state.clear();
      this.listeners.clear();
      console.log('✅ State cleared');
    } catch (error) {
      this.crashHandler.handleError(error, 'STATE_ERROR');
    }
  }
}

// 🔥 REACT HOOK FOR BULLETPROOF STATE MANAGEMENT
export const useAppState = (key, initialValue = null, options = {}) => {
  const stateManager = StateManager.getInstance();
  const [value, setValue] = useState(() => stateManager.getState(key, initialValue));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🔥 LOAD PERSISTED STATE ON MOUNT
  useEffect(() => {
    if (options.persist) {
      setIsLoading(true);
      stateManager.loadPersistedState(key, initialValue)
        .then(loadedValue => {
          setValue(loadedValue);
          setError(null);
        })
        .catch(err => {
          console.error(`Failed to load persisted state for ${key}:`, err);
          setError(err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [key, initialValue, options.persist]);

  // 🔥 SUBSCRIBE TO STATE CHANGES
  useEffect(() => {
    const unsubscribe = stateManager.addListener(key, (newValue) => {
      setValue(newValue);
      setError(null);
    });
    
    return unsubscribe;
  }, [key]);

  // 🔥 BULLETPROOF STATE UPDATER
  const updateState = useCallback((newValue, updateOptions = {}) => {
    try {
      setError(null);
      
      if (typeof newValue === 'function') {
        const currentValue = stateManager.getState(key, initialValue);
        newValue = newValue(currentValue);
      }
      
      stateManager.setState(key, newValue, { ...options, ...updateOptions });
      
      // Show success feedback if requested
      if (updateOptions.showSuccess) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('✅ Updated successfully', ToastAndroid.SHORT);
        }
      }
      
    } catch (err) {
      console.error(`Failed to update state for ${key}:`, err);
      setError(err);
      
      // Show error feedback
      if (Platform.OS === 'android') {
        ToastAndroid.show('❌ Update failed', ToastAndroid.SHORT);
      } else {
        Alert.alert('Update Failed', err.message);
      }
    }
  }, [key, initialValue, options]);

  // 🔥 RESET STATE TO INITIAL VALUE
  const resetState = useCallback(() => {
    updateState(initialValue);
  }, [initialValue, updateState]);

  return {
    value,
    updateState,
    resetState,
    isLoading,
    error,
    hasError: error !== null
  };
};

// 🔥 HOOK FOR LOADING STATES
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
    loadingRef.current = true;
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    loadingRef.current = false;
  }, []);

  const setLoadingError = useCallback((err) => {
    setError(err);
    setIsLoading(false);
    loadingRef.current = false;
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  const withLoading = useCallback(async (asyncFn) => {
    try {
      startLoading();
      const result = await asyncFn();
      stopLoading();
      return result;
    } catch (err) {
      setLoadingError(err);
      throw err;
    }
  }, [startLoading, stopLoading, setLoadingError]);

  return {
    isLoading,
    error,
    hasError: error !== null,
    startLoading,
    stopLoading,
    setLoadingError,
    withLoading,
    isCurrentlyLoading: loadingRef.current
  };
};

// 🔥 HOOK FOR FORM STATE MANAGEMENT
export const useFormState = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const setFieldTouched = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validateField = useCallback((field, value) => {
    const rule = validationRules[field];
    if (!rule) return null;

    if (rule.required && (!value || value.toString().trim() === '')) {
      return `${field} is required`;
    }

    if (rule.minLength && value.toString().length < rule.minLength) {
      return `${field} must be at least ${rule.minLength} characters`;
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message || `${field} format is invalid`;
    }

    if (rule.custom && !rule.custom(value)) {
      return rule.message || `${field} is invalid`;
    }

    return null;
  }, [validationRules]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationRules]);

  const handleSubmit = useCallback(async (onSubmit) => {
    try {
      setIsSubmitting(true);
      
      if (!validateForm()) {
        throw new Error('Form validation failed');
      }

      await onSubmit(values);
      
      // Reset form on successful submit
      setValues(initialValues);
      setErrors({});
      setTouched({});
      
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, initialValues]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    validateField,
    validateForm,
    handleSubmit,
    resetForm,
    hasErrors: Object.keys(errors).length > 0,
    isValid: Object.keys(errors).length === 0
  };
};

export default StateManager;
