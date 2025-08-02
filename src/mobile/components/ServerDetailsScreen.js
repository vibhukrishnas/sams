import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * Detailed Server View Component for Client's Cloud API Integration
 * Shows comprehensive server information when user clicks on a server
 */
const ServerDetailsScreen = ({ route, navigation }) => {
  const { serverId, serverName } = route.params;
  const [serverDetails, setServerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const API_BASE_URL = 'http://localhost:5002/api/v1/servers';

  useEffect(() => {
    fetchServerDetails();
  }, [serverId]);

  const fetchServerDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/${serverId}/details`);
      const data = await response.json();
      
      if (response.ok) {
        setServerDetails(data.server_details);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch server details');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to connect to server API');
      console.error('Error fetching server details:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServerDetails();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'online': return '#4CAF50';
      case 'offline': return '#F44336';
      case 'warning': return '#FF9800';
      case 'critical': return '#E91E63';
      default: return '#757575';
    }
  };

  const getCloudProviderIcon = (provider) => {
    switch (provider?.toLowerCase()) {
      case 'aws': return 'cloud';
      case 'azure': return 'cloud-outline';
      case 'gcp': return 'cloud-circle';
      case 'custom': return 'server';
      default: return 'hardware-chip';
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Basic Server Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Information</Text>
        <View style={styles.infoGrid}>
          <InfoCard 
            title="Server Name" 
            value={serverDetails?.server_basic_info?.name || 'N/A'} 
            icon="server"
          />
          <InfoCard 
            title="Host" 
            value={serverDetails?.server_basic_info?.host || 'N/A'} 
            icon="globe"
          />
          <InfoCard 
            title="Port" 
            value={serverDetails?.server_basic_info?.port || 'N/A'} 
            icon="radio"
          />
          <InfoCard 
            title="Status" 
            value={serverDetails?.server_basic_info?.status || 'N/A'} 
            icon="pulse"
            valueColor={getStatusColor(serverDetails?.server_basic_info?.status)}
          />
        </View>
      </View>

      {/* Cloud Provider Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Provider</Text>
        <View style={styles.cloudProviderCard}>
          <Ionicons 
            name={getCloudProviderIcon(serverDetails?.cloud_provider)} 
            size={48} 
            color="#2196F3" 
          />
          <Text style={styles.cloudProviderText}>
            {serverDetails?.cloud_provider || 'Unknown'}
          </Text>
          {serverDetails?.instance_id && (
            <Text style={styles.instanceId}>
              Instance: {serverDetails.instance_id}
            </Text>
          )}
        </View>
      </View>

      {/* Current Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard 
            title="CPU Usage" 
            value={serverDetails?.current_metrics?.cpu_usage || 0}
            unit="%" 
            icon="speedometer"
            color="#FF5722"
          />
          <MetricCard 
            title="Memory" 
            value={serverDetails?.current_metrics?.memory_usage || 0}
            unit="%" 
            icon="hardware-chip"
            color="#9C27B0"
          />
          <MetricCard 
            title="Disk Usage" 
            value={serverDetails?.current_metrics?.disk_usage || 0}
            unit="%" 
            icon="archive"
            color="#FF9800"
          />
          <MetricCard 
            title="Uptime" 
            value={formatUptime(serverDetails?.current_metrics?.uptime || 0)}
            unit="" 
            icon="time"
            color="#4CAF50"
          />
        </View>
      </View>
    </View>
  );

  const renderConfigurationTab = () => (
    <View style={styles.tabContent}>
      {/* AWS Configuration */}
      {serverDetails?.cloud_provider === 'AWS' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AWS Configuration</Text>
          <ConfigItem label="Instance Type" value={serverDetails?.instance_type} />
          <ConfigItem label="Availability Zone" value={serverDetails?.availability_zone?.AvailabilityZone} />
          <ConfigItem label="VPC ID" value={serverDetails?.vpc_id} />
          <ConfigItem label="Subnet ID" value={serverDetails?.subnet_id} />
          <ConfigItem label="Public IP" value={serverDetails?.public_ip} />
          <ConfigItem label="Private IP" value={serverDetails?.private_ip} />
          <ConfigItem label="Launch Time" value={serverDetails?.launch_time} />
        </View>
      )}

      {/* Azure Configuration */}
      {serverDetails?.cloud_provider === 'Azure' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azure Configuration</Text>
          <ConfigItem label="VM Size" value={serverDetails?.vm_size?.vmSize} />
          <ConfigItem label="Resource Group" value={serverDetails?.resource_group} />
          <ConfigItem label="Location" value={serverDetails?.location} />
          <ConfigItem label="Provisioning State" value={serverDetails?.provisioning_state} />
          <ConfigItem label="Power State" value={serverDetails?.power_state} />
        </View>
      )}

      {/* GCP Configuration */}
      {serverDetails?.cloud_provider === 'GCP' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GCP Configuration</Text>
          <ConfigItem label="Machine Type" value={serverDetails?.machine_type} />
          <ConfigItem label="Zone" value={serverDetails?.zone} />
          <ConfigItem label="Creation Time" value={serverDetails?.creation_timestamp} />
        </View>
      )}

      {/* Custom Configuration */}
      {serverDetails?.cloud_provider === 'Custom' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Configuration</Text>
          <ConfigItem label="Environment" value={serverDetails?.environment} />
          <ConfigItem label="Application Stack" value={serverDetails?.application_stack} />
          <ConfigItem label="Deployment Info" value={JSON.stringify(serverDetails?.deployment_info)} />
        </View>
      )}

      {/* Network Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Configuration</Text>
        <ConfigItem 
          label="Network In" 
          value={formatBytes(serverDetails?.current_metrics?.network_in || 0)} 
        />
        <ConfigItem 
          label="Network Out" 
          value={formatBytes(serverDetails?.current_metrics?.network_out || 0)} 
        />
      </View>
    </View>
  );

  const renderMonitoringTab = () => (
    <View style={styles.tabContent}>
      {/* Cloud Monitoring */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Monitoring</Text>
        {serverDetails?.cloudwatch_metrics && (
          <Text style={styles.monitoringSource}>Source: AWS CloudWatch</Text>
        )}
        {serverDetails?.azure_metrics && (
          <Text style={styles.monitoringSource}>Source: Azure Monitor</Text>
        )}
        {serverDetails?.stackdriver_metrics && (
          <Text style={styles.monitoringSource}>Source: GCP Stackdriver</Text>
        )}
      </View>

      {/* Historical Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historical Metrics (24h)</Text>
        <Text style={styles.metricsCount}>
          {serverDetails?.metrics_count || 0} data points collected
        </Text>
      </View>

      {/* Health Checks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Checks</Text>
        <View style={styles.healthCheck}>
          <Ionicons 
            name="pulse" 
            size={24} 
            color={getStatusColor(serverDetails?.server_basic_info?.status)} 
          />
          <Text style={styles.healthCheckText}>
            Last Check: {formatDateTime(serverDetails?.timestamps?.last_check)}
          </Text>
        </View>
      </View>
    </View>
  );

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading server details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serverName}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TabButton 
          title="Overview" 
          active={activeTab === 'overview'} 
          onPress={() => setActiveTab('overview')} 
        />
        <TabButton 
          title="Config" 
          active={activeTab === 'configuration'} 
          onPress={() => setActiveTab('configuration')} 
        />
        <TabButton 
          title="Monitoring" 
          active={activeTab === 'monitoring'} 
          onPress={() => setActiveTab('monitoring')} 
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'configuration' && renderConfigurationTab()}
        {activeTab === 'monitoring' && renderMonitoringTab()}
      </ScrollView>
    </View>
  );
};

// Helper Components
const InfoCard = ({ title, value, icon, valueColor }) => (
  <View style={styles.infoCard}>
    <Ionicons name={icon} size={24} color="#2196F3" />
    <Text style={styles.infoCardTitle}>{title}</Text>
    <Text style={[styles.infoCardValue, { color: valueColor || '#333' }]}>
      {value}
    </Text>
  </View>
);

const MetricCard = ({ title, value, unit, icon, color }) => (
  <View style={styles.metricCard}>
    <Ionicons name={icon} size={32} color={color} />
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[styles.metricValue, { color }]}>
      {typeof value === 'number' ? value.toFixed(1) : value}{unit}
    </Text>
  </View>
);

const ConfigItem = ({ label, value }) => (
  <View style={styles.configItem}>
    <Text style={styles.configLabel}>{label}:</Text>
    <Text style={styles.configValue}>{value || 'N/A'}</Text>
  </View>
);

const TabButton = ({ title, active, onPress }) => (
  <TouchableOpacity 
    style={[styles.tabButton, active && styles.activeTabButton]} 
    onPress={onPress}
  >
    <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#757575',
  },
  activeTabButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  infoCardTitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  cloudProviderCard: {
    alignItems: 'center',
    padding: 20,
  },
  cloudProviderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 8,
  },
  instanceId: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  configLabel: {
    fontSize: 14,
    color: '#757575',
    flex: 1,
  },
  configValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  monitoringSource: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  metricsCount: {
    fontSize: 14,
    color: '#757575',
  },
  healthCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthCheckText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
  },
});

export default ServerDetailsScreen;
