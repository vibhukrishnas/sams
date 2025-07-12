/**
 * 🔐 Authentication Types
 * Type definitions for authentication and user management
 */

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'operator' | 'viewer';
  lastLogin?: Date;
  biometricEnabled: boolean;
  pinSetup: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoLock: boolean;
  autoLockTimeout: number; // minutes
  biometricAuth: boolean;
  language: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  loginAttempts: number;
  isLocked: boolean;
  lockUntil?: Date;
  lastActivity?: Date;
}

export interface LoginCredentials {
  username: string;
  pin: string;
}

export interface PinAuthResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
  isLocked?: boolean;
  lockDuration?: number;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometryType?: 'TouchID' | 'FaceID' | 'Fingerprint' | 'None';
  isAvailable?: boolean;
}

export interface AuthConfig {
  maxLoginAttempts: number;
  lockDuration: number; // minutes
  autoLockTimeout: number; // minutes
  pinLength: number;
  requireBiometric: boolean;
  sessionTimeout: number; // minutes
}

export interface SecuritySettings {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  autoLockEnabled: boolean;
  autoLockTimeout: number;
  requirePinOnStart: boolean;
  requirePinOnBackground: boolean;
}

// Auth Action Types
export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<PinAuthResult>;
  loginWithBiometric: () => Promise<BiometricAuthResult>;
  logout: () => Promise<void>;
  setupPin: (pin: string) => Promise<boolean>;
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<boolean>;
  checkBiometricAvailability: () => Promise<BiometricAuthResult>;
  refreshToken: () => Promise<boolean>;
  resetLoginAttempts: () => void;
  lockAccount: (duration?: number) => void;
  unlockAccount: () => void;
}

// Keychain Storage Keys
export enum KeychainKeys {
  USER_PIN = 'sams_user_pin',
  USER_TOKEN = 'sams_user_token',
  REFRESH_TOKEN = 'sams_refresh_token',
  USER_DATA = 'sams_user_data',
  BIOMETRIC_KEY = 'sams_biometric_key',
  SECURITY_SETTINGS = 'sams_security_settings',
}

// Auth Events
export enum AuthEvents {
  LOGIN_SUCCESS = 'auth/login_success',
  LOGIN_FAILURE = 'auth/login_failure',
  LOGOUT = 'auth/logout',
  TOKEN_REFRESH = 'auth/token_refresh',
  ACCOUNT_LOCKED = 'auth/account_locked',
  ACCOUNT_UNLOCKED = 'auth/account_unlocked',
  BIOMETRIC_ENABLED = 'auth/biometric_enabled',
  BIOMETRIC_DISABLED = 'auth/biometric_disabled',
  PIN_CHANGED = 'auth/pin_changed',
  SESSION_EXPIRED = 'auth/session_expired',
}
