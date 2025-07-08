import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.loginAttempts = 0;
    this.lockoutUntil = null;
  }

  /**
   * Validate PIN and handle authentication
   * @param {string} pin - 4-digit PIN to validate
   * @returns {Promise<{success: boolean, message: string, user?: object}>}
   */
  async validatePin(pin) {
    try {
      // Check if account is locked
      if (this.isAccountLocked()) {
        return {
          success: false,
          message: 'Account is temporarily locked. Please try again later.'
        };
      }

      // Validate PIN format
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        this.incrementLoginAttempts();
        return {
          success: false,
          message: 'PIN must be exactly 4 digits'
        };
      }

      // Check against stored PIN (in real app, this would be hashed)
      const storedPin = await this.getStoredPin();
      
      if (pin === storedPin) {
        // Successful login
        this.resetLoginAttempts();
        this.isAuthenticated = true;
        this.currentUser = {
          id: '1',
          name: 'System Administrator',
          role: 'admin',
          lastLogin: new Date().toISOString()
        };
        
        await this.saveUserSession();
        
        return {
          success: true,
          message: 'Login successful',
          user: this.currentUser
        };
      } else {
        // Failed login
        this.incrementLoginAttempts();
        return {
          success: false,
          message: 'Invalid PIN. Please try again.'
        };
      }
    } catch (error) {
      console.error('AuthService validatePin error:', error);
      return {
        success: false,
        message: 'Authentication error. Please try again.'
      };
    }
  }

  /**
   * Check if account is locked due to too many failed attempts
   * @returns {boolean}
   */
  isAccountLocked() {
    if (!this.lockoutUntil) return false;
    return new Date() < this.lockoutUntil;
  }

  /**
   * Increment failed login attempts and lock account if necessary
   */
  incrementLoginAttempts() {
    this.loginAttempts++;
    
    if (this.loginAttempts >= 5) {
      // Lock account for 15 minutes
      this.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      this.saveLockoutState();
    }
  }

  /**
   * Reset login attempts after successful login
   */
  resetLoginAttempts() {
    this.loginAttempts = 0;
    this.lockoutUntil = null;
    this.saveLockoutState();
  }

  /**
   * Logout user and clear session
   * @returns {Promise<boolean>}
   */
  async logout() {
    try {
      this.isAuthenticated = false;
      this.currentUser = null;
      await AsyncStorage.removeItem('userSession');
      return true;
    } catch (error) {
      console.error('AuthService logout error:', error);
      return false;
    }
  }

  /**
   * Check if user is currently authenticated
   * @returns {boolean}
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Get current user information
   * @returns {object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get remaining login attempts
   * @returns {number}
   */
  getRemainingAttempts() {
    return Math.max(0, 5 - this.loginAttempts);
  }

  /**
   * Get lockout time remaining in minutes
   * @returns {number}
   */
  getLockoutTimeRemaining() {
    if (!this.lockoutUntil) return 0;
    const remaining = this.lockoutUntil - new Date();
    return Math.max(0, Math.ceil(remaining / (1000 * 60)));
  }

  /**
   * Save user session to storage
   * @returns {Promise<void>}
   */
  async saveUserSession() {
    try {
      const sessionData = {
        user: this.currentUser,
        timestamp: new Date().toISOString()
      };
      await AsyncStorage.setItem('userSession', JSON.stringify(sessionData));
    } catch (error) {
      console.error('AuthService saveUserSession error:', error);
    }
  }

  /**
   * Load user session from storage
   * @returns {Promise<boolean>}
   */
  async loadUserSession() {
    try {
      const sessionData = await AsyncStorage.getItem('userSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        this.currentUser = session.user;
        this.isAuthenticated = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('AuthService loadUserSession error:', error);
      return false;
    }
  }

  /**
   * Get stored PIN from storage
   * @returns {Promise<string>}
   */
  async getStoredPin() {
    try {
      const pin = await AsyncStorage.getItem('userPin');
      return pin || '1234'; // Default PIN for demo
    } catch (error) {
      console.error('AuthService getStoredPin error:', error);
      return '1234'; // Default PIN for demo
    }
  }

  /**
   * Set new PIN
   * @param {string} newPin - New 4-digit PIN
   * @returns {Promise<boolean>}
   */
  async setPin(newPin) {
    try {
      if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        return false;
      }
      await AsyncStorage.setItem('userPin', newPin);
      return true;
    } catch (error) {
      console.error('AuthService setPin error:', error);
      return false;
    }
  }

  /**
   * Save lockout state to storage
   * @returns {Promise<void>}
   */
  async saveLockoutState() {
    try {
      const lockoutData = {
        attempts: this.loginAttempts,
        lockoutUntil: this.lockoutUntil ? this.lockoutUntil.toISOString() : null
      };
      await AsyncStorage.setItem('lockoutState', JSON.stringify(lockoutData));
    } catch (error) {
      console.error('AuthService saveLockoutState error:', error);
    }
  }

  /**
   * Load lockout state from storage
   * @returns {Promise<void>}
   */
  async loadLockoutState() {
    try {
      const lockoutData = await AsyncStorage.getItem('lockoutState');
      if (lockoutData) {
        const state = JSON.parse(lockoutData);
        this.loginAttempts = state.attempts || 0;
        this.lockoutUntil = state.lockoutUntil ? new Date(state.lockoutUntil) : null;
      }
    } catch (error) {
      console.error('AuthService loadLockoutState error:', error);
    }
  }

  /**
   * Initialize auth service
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.loadLockoutState();
    await this.loadUserSession();
  }
}

export default new AuthService(); 