/**
 * 🌍 Internationalization (i18n) Setup
 * Multi-language support for SAMS mobile app
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import language resources
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // Try to get saved language from storage
      const savedLanguage = await AsyncStorage.getItem('user-language');
      
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }

      // Fall back to device locale
      const deviceLocales = getLocales();
      const deviceLanguage = deviceLocales[0]?.languageCode || 'en';
      
      callback(deviceLanguage);
    } catch (error) {
      console.warn('Language detection failed:', error);
      callback('en'); // Default to English
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem('user-language', lng);
    } catch (error) {
      console.warn('Failed to cache language:', error);
    }
  },
};

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  ja: { translation: ja },
  zh: { translation: zh },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: __DEV__,
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    react: {
      useSuspense: false,
    },
    
    // Namespace configuration
    defaultNS: 'translation',
    ns: ['translation'],
    
    // Key separator
    keySeparator: '.',
    
    // Nested separator
    nsSeparator: ':',
    
    // Pluralization
    pluralSeparator: '_',
    
    // Context separator
    contextSeparator: '_',
    
    // Load path for dynamic loading (if needed)
    // backend: {
    //   loadPath: '/locales/{{lng}}/{{ns}}.json',
    // },
  });

export default i18n;

// Helper functions
export const changeLanguage = async (language: string): Promise<void> => {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem('user-language', language);
    console.log(`Language changed to: ${language}`);
  } catch (error) {
    console.error('Failed to change language:', error);
  }
};

export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

export const getSupportedLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
];

export const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const locale = getCurrentLanguage();
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date);
};

export const formatNumber = (number: number, options?: Intl.NumberFormatOptions): string => {
  const locale = getCurrentLanguage();
  return new Intl.NumberFormat(locale, options).format(number);
};

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  const locale = getCurrentLanguage();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  const locale = getCurrentLanguage();
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

// RTL language support
export const isRTL = (): boolean => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(getCurrentLanguage());
};

// Pluralization helper
export const getPlural = (count: number, singular: string, plural?: string): string => {
  if (count === 1) {
    return i18n.t(singular);
  }
  return i18n.t(plural || `${singular}_plural`, { count });
};

// Translation with fallback
export const t = (key: string, options?: any): string => {
  try {
    return i18n.t(key, options);
  } catch (error) {
    console.warn(`Translation missing for key: ${key}`);
    return key; // Return key as fallback
  }
};

// Namespace translation
export const tNS = (namespace: string, key: string, options?: any): string => {
  try {
    return i18n.t(`${namespace}:${key}`, options);
  } catch (error) {
    console.warn(`Translation missing for ${namespace}:${key}`);
    return key;
  }
};

// Context-aware translation
export const tContext = (key: string, context: string, options?: any): string => {
  try {
    return i18n.t(`${key}_${context}`, options);
  } catch (error) {
    console.warn(`Context translation missing for ${key}_${context}`);
    return i18n.t(key, options);
  }
};

// Initialize i18n on app start
export const initializeI18n = async (): Promise<void> => {
  try {
    await i18n.init();
    console.log('✅ i18n initialized successfully');
  } catch (error) {
    console.error('❌ i18n initialization failed:', error);
  }
};

// Language change listener
export const addLanguageChangeListener = (callback: (language: string) => void) => {
  i18n.on('languageChanged', callback);
  return () => i18n.off('languageChanged', callback);
};

// Resource loading status
export const isResourceLoaded = (language: string): boolean => {
  return i18n.hasResourceBundle(language, 'translation');
};

// Load additional resources dynamically
export const loadLanguageResources = async (language: string): Promise<void> => {
  try {
    if (!isResourceLoaded(language)) {
      // In a real app, you might load from a remote server
      console.log(`Loading resources for language: ${language}`);
      // await i18n.loadLanguages(language);
    }
  } catch (error) {
    console.error(`Failed to load resources for ${language}:`, error);
  }
};

// Export i18n instance for direct access
export { i18n };
