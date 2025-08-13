import AsyncStorage from '@react-native-async-storage/async-storage';

export class AuthService {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.loginAttempts = 0;
    this.lockoutUntil = null;
  }

  /**
   * Validate PIN and handle authentication
   */
  async validatePin(pin: string) {
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

      // Check against stored PIN (default: 1234)
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
          message: 'Authentication successful',
          user: this.currentUser
        };
      } else {
        this.incrementLoginAttempts();
        return {
          success: false,
          message: `Invalid PIN. ${this.getRemainingAttempts()} attempts remaining.`
        };
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication service error'
      };
    }
  }

  /**
   * Get stored PIN (default 1234 for demo)
   */
  async getStoredPin(): Promise<string> {
    try {
      const pin = await AsyncStorage.getItem('user_pin');
      return pin || '1234'; // Default PIN
    } catch (error) {
      return '1234'; // Fallback PIN
    }
  }

  /**
   * Set new PIN
   */
  async setPin(newPin: string): Promise<boolean> {
    try {
      if (!/^\d{4}$/.test(newPin)) {
        return false;
      }
      await AsyncStorage.setItem('user_pin', newPin);
      return true;
    } catch (error) {
      console.error('Error setting PIN:', error);
      return false;
    }
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(): boolean {
    if (this.lockoutUntil && new Date() < this.lockoutUntil) {
      return true;
    }
    return false;
  }

  /**
   * Increment login attempts and lock account if necessary
   */
  incrementLoginAttempts() {
    this.loginAttempts++;
    if (this.loginAttempts >= 5) {
      this.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
    }
  }

  /**
   * Reset login attempts
   */
  resetLoginAttempts() {
    this.loginAttempts = 0;
    this.lockoutUntil = null;
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    return Math.max(0, 5 - this.loginAttempts);
  }

  /**
   * Save user session
   */
  async saveUserSession() {
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify({
        isAuthenticated: true,
        user: this.currentUser,
        loginTime: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Load existing session
   */
  async loadSession() {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const sessionData = JSON.parse(session);
        // Check if session is still valid (24 hours)
        const loginTime = new Date(sessionData.loginTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          this.isAuthenticated = sessionData.isAuthenticated;
          this.currentUser = sessionData.user;
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading session:', error);
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      this.isAuthenticated = false;
      this.currentUser = null;
      await AsyncStorage.removeItem('user_session');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }
}

// Export singleton instance
export const authService = new AuthService();
