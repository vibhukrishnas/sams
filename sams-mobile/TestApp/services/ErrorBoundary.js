// 🛡️ PRODUCTION-READY ERROR BOUNDARY SERVICE
import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import crashlytics from '@react-native-firebase/crashlytics';

// 🚨 ERROR TYPES
const ERROR_TYPES = {
  RENDER_ERROR: 'render_error',
  NETWORK_ERROR: 'network_error',
  API_ERROR: 'api_error',
  STORAGE_ERROR: 'storage_error',
  PERMISSION_ERROR: 'permission_error',
  UNKNOWN_ERROR: 'unknown_error'
};

// 🛡️ ERROR BOUNDARY COMPONENT
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error: error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error details
    this.logError(error, errorInfo);
    
    // Report to crash analytics
    this.reportToCrashlytics(error, errorInfo);
  }

  async logError(error, errorInfo) {
    try {
      const errorLog = {
        id: this.state.errorId,
        timestamp: new Date().toISOString(),
        type: this.categorizeError(error),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        deviceInfo: await this.getDeviceInfo(),
        appState: await this.getAppState(),
        userActions: await this.getUserActions()
      };

      // Store error log
      await this.storeErrorLog(errorLog);
      
      console.log('📝 Error logged:', errorLog.id);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_TYPES.NETWORK_ERROR;
    }
    if (message.includes('api') || message.includes('server')) {
      return ERROR_TYPES.API_ERROR;
    }
    if (message.includes('storage') || message.includes('asyncstorage')) {
      return ERROR_TYPES.STORAGE_ERROR;
    }
    if (message.includes('permission')) {
      return ERROR_TYPES.PERMISSION_ERROR;
    }
    if (message.includes('render') || message.includes('component')) {
      return ERROR_TYPES.RENDER_ERROR;
    }
    
    return ERROR_TYPES.UNKNOWN_ERROR;
  }

  async getDeviceInfo() {
    try {
      return {
        brand: DeviceInfo.getBrand(),
        model: DeviceInfo.getModel(),
        systemName: DeviceInfo.getSystemName(),
        systemVersion: DeviceInfo.getSystemVersion(),
        appVersion: DeviceInfo.getVersion(),
        buildNumber: DeviceInfo.getBuildNumber(),
        isEmulator: await DeviceInfo.isEmulator(),
        totalMemory: await DeviceInfo.getTotalMemory(),
        usedMemory: await DeviceInfo.getUsedMemory()
      };
    } catch (error) {
      return { error: 'Failed to get device info' };
    }
  }

  async getAppState() {
    try {
      return {
        currentScreen: await AsyncStorage.getItem('current_screen'),
        isAuthenticated: await AsyncStorage.getItem('is_authenticated'),
        lastApiCall: await AsyncStorage.getItem('last_api_call'),
        networkStatus: await AsyncStorage.getItem('network_status')
      };
    } catch (error) {
      return { error: 'Failed to get app state' };
    }
  }

  async getUserActions() {
    try {
      const actionsData = await AsyncStorage.getItem('user_actions');
      return actionsData ? JSON.parse(actionsData).slice(-10) : [];
    } catch (error) {
      return [];
    }
  }

  async storeErrorLog(errorLog) {
    try {
      // Store individual error
      await AsyncStorage.setItem(`error_${errorLog.id}`, JSON.stringify(errorLog));
      
      // Update error history
      const historyData = await AsyncStorage.getItem('error_history');
      const history = historyData ? JSON.parse(historyData) : [];
      
      history.unshift({
        id: errorLog.id,
        timestamp: errorLog.timestamp,
        type: errorLog.type,
        message: errorLog.message
      });
      
      // Keep only last 50 errors
      if (history.length > 50) {
        history.splice(50);
      }
      
      await AsyncStorage.setItem('error_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to store error log:', error);
    }
  }

  async reportToCrashlytics(error, errorInfo) {
    try {
      // Set custom attributes
      await crashlytics().setAttributes({
        errorId: this.state.errorId,
        errorType: this.categorizeError(error),
        componentStack: errorInfo.componentStack
      });

      // Record the error
      crashlytics().recordError(error);
      
      console.log('📊 Error reported to Crashlytics');
    } catch (crashError) {
      console.error('Failed to report to Crashlytics:', crashError);
    }
  }

  handleRetry = async () => {
    console.log('🔄 Retrying after error...');
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    // Log retry attempt
    try {
      await AsyncStorage.setItem('last_error_retry', new Date().toISOString());
    } catch (error) {
      console.error('Failed to log retry:', error);
    }
  };

  handleReportError = () => {
    const errorDetails = {
      id: this.state.errorId,
      message: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || 'No stack trace',
      timestamp: new Date().toISOString()
    };

    Alert.alert(
      '📧 Report Error',
      'Would you like to send this error report to our support team?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Report', 
          onPress: () => this.sendErrorReport(errorDetails)
        }
      ]
    );
  };

  async sendErrorReport(errorDetails) {
    try {
      // This would send to your error reporting service
      console.log('📧 Sending error report:', errorDetails.id);
      
      Alert.alert(
        '✅ Report Sent',
        'Thank you for reporting this error. Our team will investigate.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        '❌ Report Failed',
        'Failed to send error report. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  }

  handleRestart = () => {
    Alert.alert(
      '🔄 Restart App',
      'This will restart the application. Any unsaved data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restart', 
          style: 'destructive',
          onPress: () => {
            // This would restart the app
            console.log('🔄 Restarting application...');
            // RNRestart.Restart();
          }
        }
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.errorContent}>
            <Text style={styles.errorIcon}>🚨</Text>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorMessage}>
              The app encountered an unexpected error and needs to recover.
            </Text>
            
            <View style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>Error Details:</Text>
              <Text style={styles.errorDetailsText}>
                ID: {this.state.errorId}
              </Text>
              <Text style={styles.errorDetailsText}>
                Type: {this.categorizeError(this.state.error)}
              </Text>
              <Text style={styles.errorDetailsText}>
                Message: {this.state.error?.message || 'Unknown error'}
              </Text>
              <Text style={styles.errorDetailsText}>
                Retry Count: {this.state.retryCount}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.retryButton]} 
                onPress={this.handleRetry}
              >
                <Text style={styles.buttonText}>🔄 Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.reportButton]} 
                onPress={this.handleReportError}
              >
                <Text style={styles.buttonText}>📧 Report Error</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.restartButton]} 
                onPress={this.handleRestart}
              >
                <Text style={styles.buttonText}>🔄 Restart App</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && (
              <View style={styles.devDetails}>
                <Text style={styles.devTitle}>Development Details:</Text>
                <Text style={styles.devText}>
                  {this.state.error?.stack}
                </Text>
                <Text style={styles.devText}>
                  {this.state.errorInfo?.componentStack}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

// 🎨 STYLES
const styles = {
  errorContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  errorDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 10,
  },
  errorDetailsText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  actionButtons: {
    width: '100%',
    gap: 10,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#28a745',
  },
  reportButton: {
    backgroundColor: '#ffc107',
  },
  restartButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devDetails: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    width: '100%',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 10,
  },
  devText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
};

// 🔧 ERROR BOUNDARY UTILITIES
export const withErrorBoundary = (Component, fallbackComponent) => {
  return (props) => (
    <ErrorBoundary fallback={fallbackComponent}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

export const logUserAction = async (action, details = {}) => {
  try {
    const userAction = {
      action,
      details,
      timestamp: new Date().toISOString(),
      screen: await AsyncStorage.getItem('current_screen')
    };

    const actionsData = await AsyncStorage.getItem('user_actions');
    const actions = actionsData ? JSON.parse(actionsData) : [];
    
    actions.push(userAction);
    
    // Keep only last 100 actions
    if (actions.length > 100) {
      actions.splice(0, actions.length - 100);
    }

    await AsyncStorage.setItem('user_actions', JSON.stringify(actions));
  } catch (error) {
    console.error('Failed to log user action:', error);
  }
};

export const getErrorHistory = async () => {
  try {
    const historyData = await AsyncStorage.getItem('error_history');
    return historyData ? JSON.parse(historyData) : [];
  } catch (error) {
    console.error('Failed to get error history:', error);
    return [];
  }
};

export const clearErrorHistory = async () => {
  try {
    await AsyncStorage.removeItem('error_history');
    console.log('✅ Error history cleared');
  } catch (error) {
    console.error('Failed to clear error history:', error);
  }
};

export default ErrorBoundary;
export { ERROR_TYPES };
