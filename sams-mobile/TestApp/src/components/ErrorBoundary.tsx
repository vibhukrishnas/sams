/**
 * 🛡️ Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree and displays fallback UI
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CrashReportingService from '../services/CrashReportingService';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: any, retry: () => void) => ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private crashReporter: CrashReportingService;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };

    this.crashReporter = CrashReportingService.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 Error Boundary caught an error:', error, errorInfo);
    
    // Report the error to crash reporting service
    this.reportError(error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  private async reportError(error: Error, errorInfo: any) {
    try {
      const errorId = await this.crashReporter.reportComponentError(
        error,
        errorInfo,
        {
          boundary: 'ErrorBoundary',
          timestamp: Date.now(),
          userAgent: 'React Native',
        }
      );
      
      this.setState({ errorId });
      
      console.log(`Error reported with ID: ${errorId}`);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReportIssue = () => {
    const { error, errorInfo, errorId } = this.state;
    
    Alert.alert(
      'Report Issue',
      `Would you like to send a detailed error report?\n\nError ID: ${errorId || 'Unknown'}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Report',
          onPress: () => {
            // In a real app, this would open email or support system
            Alert.alert(
              'Report Sent',
              'Thank you for reporting this issue. Our team will investigate.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  private handleViewDetails = () => {
    const { error, errorInfo } = this.state;
    
    Alert.alert(
      'Error Details',
      `Error: ${error?.message}\n\nStack: ${error?.stack?.substring(0, 200)}...`,
      [{ text: 'OK' }]
    );
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Custom fallback UI if provided
      if (fallback) {
        return fallback(error, errorInfo, this.handleRetry);
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Error Icon */}
            <View style={styles.iconContainer}>
              <Icon name="error-outline" size={80} color="#F44336" />
            </View>

            {/* Error Title */}
            <Text style={styles.title}>Oops! Something went wrong</Text>
            
            {/* Error Description */}
            <Text style={styles.description}>
              We encountered an unexpected error. Don't worry, this has been reported 
              to our team and we're working to fix it.
            </Text>

            {/* Error Message */}
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorMessage}>
                {error.message || 'Unknown error occurred'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleRetry}
                accessibilityLabel="Try Again"
              >
                <Icon name="refresh" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleReportIssue}
                accessibilityLabel="Report Issue"
              >
                <Icon name="bug-report" size={20} color="#1976D2" />
                <Text style={styles.secondaryButtonText}>Report Issue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.tertiaryButton]}
                onPress={this.handleViewDetails}
                accessibilityLabel="View Details"
              >
                <Icon name="info" size={20} color="#666" />
                <Text style={styles.tertiaryButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>

            {/* Error ID */}
            {this.state.errorId && (
              <View style={styles.errorIdContainer}>
                <Text style={styles.errorIdLabel}>Error ID:</Text>
                <Text style={styles.errorIdText}>{this.state.errorId}</Text>
              </View>
            )}

            {/* Help Text */}
            <Text style={styles.helpText}>
              If this problem persists, please contact support with the error ID above.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#1976D2',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  tertiaryButton: {
    backgroundColor: '#f5f5f5',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 8,
  },
  tertiaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  errorIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorIdLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginRight: 8,
  },
  errorIdText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ErrorBoundary;
