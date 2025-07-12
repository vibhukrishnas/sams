/**
 * 📚 API Service Usage Examples
 * Demonstrates how to use the new ApiService in React components
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

// Import API services
import { 
  alertApi, 
  serverApi, 
  authApi, 
  dashboardApi, 
  voiceApi,
  apiService 
} from '../services/ApiServiceFactory';

// Import RTK Query hooks
import {
  useGetAlertsQuery,
  useGetServersQuery,
  useGetDashboardQuery,
  useSendSOSAlertMutation,
  useProcessVoiceCommandMutation,
} from '../store/api/samsApi';

const ApiServiceUsageExample: React.FC = () => {
  const [networkStatus, setNetworkStatus] = useState(true);
  const [queuedRequests, setQueuedRequests] = useState(0);

  // RTK Query hooks
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useGetAlertsQuery();
  const { data: servers, isLoading: serversLoading } = useGetServersQuery();
  const { data: dashboard, isLoading: dashboardLoading } = useGetDashboardQuery();
  
  // RTK Query mutations
  const [sendSOS] = useSendSOSAlertMutation();
  const [processVoiceCommand] = useProcessVoiceCommandMutation();

  useEffect(() => {
    // Monitor network status and queue
    const interval = setInterval(() => {
      setNetworkStatus(apiService.isNetworkOnline());
      setQueuedRequests(apiService.getQueuedRequestsCount());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Example 1: Using direct API service calls
  const handleDirectApiCall = async () => {
    try {
      console.log('🌐 Making direct API call...');
      
      // Get alerts using direct API service
      const alertsResponse = await alertApi.getAlerts({ severity: 'critical' });
      console.log('Alerts:', alertsResponse);

      // Get servers using direct API service
      const serversResponse = await serverApi.getServers();
      console.log('Servers:', serversResponse);

      Alert.alert('Success', 'Direct API calls completed successfully');
    } catch (error) {
      console.error('Direct API call error:', error);
      Alert.alert('Error', 'Direct API call failed');
    }
  };

  // Example 2: Using RTK Query hooks (recommended for components)
  const handleRTKQueryCall = () => {
    console.log('📊 RTK Query data:');
    console.log('Alerts:', alerts);
    console.log('Servers:', servers);
    console.log('Dashboard:', dashboard);
    
    Alert.alert(
      'RTK Query Data',
      `Alerts: ${alerts?.length || 0}, Servers: ${servers?.length || 0}`
    );
  };

  // Example 3: Emergency SOS
  const handleEmergencySOS = async () => {
    try {
      console.log('🚨 Triggering Emergency SOS...');
      
      // Using RTK Query mutation
      await sendSOS({
        message: 'Emergency assistance needed',
        location: { lat: 40.7128, lng: -74.0060 }
      }).unwrap();

      Alert.alert('SOS Sent', 'Emergency alert has been sent successfully');
    } catch (error) {
      console.error('SOS error:', error);
      Alert.alert('SOS Failed', 'Failed to send emergency alert');
    }
  };

  // Example 4: Voice Command Processing
  const handleVoiceCommand = async () => {
    try {
      console.log('🎤 Processing voice command...');
      
      const result = await processVoiceCommand({
        transcript: 'show critical alerts',
        confidence: 0.95,
        language: 'en-US'
      }).unwrap();

      Alert.alert('Voice Command', `Command processed: ${result.response}`);
    } catch (error) {
      console.error('Voice command error:', error);
      Alert.alert('Voice Command Failed', 'Failed to process voice command');
    }
  };

  // Example 5: Server Management
  const handleServerOperations = async () => {
    try {
      console.log('🖥️ Server operations...');
      
      // Add a new server
      const newServer = {
        name: 'Test Server',
        ip: '192.168.1.100',
        port: 22,
        type: 'linux',
        description: 'Test server for demonstration'
      };

      const addResult = await serverApi.addServer(newServer);
      console.log('Server added:', addResult);

      // Test connection
      if (addResult.data?.id) {
        const testResult = await serverApi.testConnection(addResult.data.id);
        console.log('Connection test:', testResult);
      }

      Alert.alert('Server Operations', 'Server operations completed');
    } catch (error) {
      console.error('Server operations error:', error);
      Alert.alert('Server Operations Failed', 'Failed to perform server operations');
    }
  };

  // Example 6: Alert Management
  const handleAlertOperations = async () => {
    try {
      console.log('🚨 Alert operations...');
      
      // Get critical alerts
      const criticalAlerts = await alertApi.getAlerts({ 
        severity: 'critical', 
        acknowledged: false 
      });
      
      console.log('Critical alerts:', criticalAlerts);

      // Acknowledge first alert if exists
      if (criticalAlerts.data && criticalAlerts.data.length > 0) {
        const firstAlert = criticalAlerts.data[0];
        await alertApi.acknowledgeAlert(firstAlert.id, 'Acknowledged via mobile app');
        console.log('Alert acknowledged:', firstAlert.id);
      }

      Alert.alert('Alert Operations', 'Alert operations completed');
    } catch (error) {
      console.error('Alert operations error:', error);
      Alert.alert('Alert Operations Failed', 'Failed to perform alert operations');
    }
  };

  // Example 7: Dashboard Data
  const handleDashboardData = async () => {
    try {
      console.log('📊 Getting dashboard data...');
      
      const dashboardData = await dashboardApi.getDashboardData();
      console.log('Dashboard data:', dashboardData);

      const systemHealth = await dashboardApi.getSystemHealth();
      console.log('System health:', systemHealth);

      Alert.alert(
        'Dashboard Data',
        `Health Score: ${dashboardData.data?.systemHealth?.healthScore || 'N/A'}%`
      );
    } catch (error) {
      console.error('Dashboard data error:', error);
      Alert.alert('Dashboard Failed', 'Failed to get dashboard data');
    }
  };

  // Example 8: Authentication
  const handleAuthOperations = async () => {
    try {
      console.log('🔐 Auth operations...');
      
      // Get current user
      const currentUser = await authApi.getCurrentUser();
      console.log('Current user:', currentUser);

      Alert.alert(
        'Authentication',
        `Current user: ${currentUser.data?.username || 'Unknown'}`
      );
    } catch (error) {
      console.error('Auth operations error:', error);
      Alert.alert('Auth Failed', 'Failed to perform auth operations');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Service Usage Examples</Text>
      
      {/* Network Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Network: {networkStatus ? '🟢 Online' : '🔴 Offline'}
        </Text>
        <Text style={styles.statusText}>
          Queued Requests: {queuedRequests}
        </Text>
      </View>

      {/* Loading States */}
      {(alertsLoading || serversLoading || dashboardLoading) && (
        <Text style={styles.loadingText}>Loading data...</Text>
      )}

      {/* Error States */}
      {alertsError && (
        <Text style={styles.errorText}>Alerts Error: {alertsError.toString()}</Text>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button title="Direct API Call" onPress={handleDirectApiCall} />
        <Button title="RTK Query Data" onPress={handleRTKQueryCall} />
        <Button title="Emergency SOS" onPress={handleEmergencySOS} color="#FF0000" />
        <Button title="Voice Command" onPress={handleVoiceCommand} />
        <Button title="Server Operations" onPress={handleServerOperations} />
        <Button title="Alert Operations" onPress={handleAlertOperations} />
        <Button title="Dashboard Data" onPress={handleDashboardData} />
        <Button title="Auth Operations" onPress={handleAuthOperations} />
      </View>

      {/* Data Display */}
      <View style={styles.dataContainer}>
        <Text style={styles.dataTitle}>Current Data:</Text>
        <Text>Alerts: {alerts?.length || 0}</Text>
        <Text>Servers: {servers?.length || 0}</Text>
        <Text>Health Score: {dashboard?.systemHealth?.healthScore || 'N/A'}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#FF0000',
    marginBottom: 10,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  dataContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  dataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
});

export default ApiServiceUsageExample;
