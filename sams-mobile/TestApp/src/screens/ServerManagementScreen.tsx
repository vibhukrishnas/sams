/**
 * 🖥️ Server Management Module
 * Centralized server inventory and management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AddServerModal from '../components/AddServerModal';

interface Server {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  lastCheck: Date;
  osType: string;
  osVersion: string;
  serverType: 'Web' | 'Database' | 'Application' | 'Load Balancer' | 'Cache';
  environment: 'Production' | 'Staging' | 'Development';
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  sshCredentials?: {
    username: string;
    port: number;
    keyPath?: string;
  };
  services: Array<{
    name: string;
    status: 'running' | 'stopped' | 'error';
    port?: number;
  }>;
  tags: string[];
}

const ServerManagementScreen: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([
    {
      id: '1',
      name: 'Web Server 01',
      hostname: 'web01.company.com',
      ipAddress: '192.168.1.10',
      status: 'online',
      lastCheck: new Date(Date.now() - 120000),
      osType: 'Ubuntu',
      osVersion: '22.04 LTS',
      serverType: 'Web',
      environment: 'Production',
      uptime: '15 days, 4 hours',
      cpuUsage: 45,
      memoryUsage: 68,
      diskUsage: 72,
      networkIn: 1.2,
      networkOut: 2.8,
      sshCredentials: {
        username: 'admin',
        port: 22,
        keyPath: '/keys/web01.pem'
      },
      services: [
        { name: 'nginx', status: 'running', port: 80 },
        { name: 'nginx', status: 'running', port: 443 },
        { name: 'node', status: 'running', port: 3000 }
      ],
      tags: ['production', 'web', 'frontend']
    },
    {
      id: '2',
      name: 'Database Server',
      hostname: 'db01.company.com',
      ipAddress: '192.168.1.20',
      status: 'online',
      lastCheck: new Date(Date.now() - 60000),
      osType: 'CentOS',
      osVersion: '8.5',
      serverType: 'Database',
      environment: 'Production',
      uptime: '30 days, 12 hours',
      cpuUsage: 32,
      memoryUsage: 85,
      diskUsage: 45,
      networkIn: 0.8,
      networkOut: 1.5,
      sshCredentials: {
        username: 'dbadmin',
        port: 22,
        keyPath: '/keys/db01.pem'
      },
      services: [
        { name: 'postgresql', status: 'running', port: 5432 },
        { name: 'redis', status: 'running', port: 6379 }
      ],
      tags: ['production', 'database', 'postgresql']
    },
    {
      id: '3',
      name: 'App Server 01',
      hostname: 'app01.company.com',
      ipAddress: '192.168.1.30',
      status: 'warning',
      lastCheck: new Date(Date.now() - 600000),
      osType: 'Ubuntu',
      osVersion: '20.04 LTS',
      serverType: 'Application',
      environment: 'Staging',
      uptime: '5 days, 8 hours',
      cpuUsage: 78,
      memoryUsage: 92,
      diskUsage: 88,
      networkIn: 2.1,
      networkOut: 3.4,
      sshCredentials: {
        username: 'appuser',
        port: 22,
        keyPath: '/keys/app01.pem'
      },
      services: [
        { name: 'java', status: 'running', port: 8080 },
        { name: 'tomcat', status: 'error', port: 8443 }
      ],
      tags: ['staging', 'application', 'java']
    },
    {
      id: '4',
      name: 'Load Balancer',
      hostname: 'lb01.company.com',
      ipAddress: '192.168.1.40',
      status: 'offline',
      lastCheck: new Date(Date.now() - 7200000),
      osType: 'Ubuntu',
      osVersion: '22.04 LTS',
      serverType: 'Load Balancer',
      environment: 'Production',
      uptime: '0 days, 0 hours',
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 65,
      networkIn: 0,
      networkOut: 0,
      sshCredentials: {
        username: 'lbadmin',
        port: 22,
        keyPath: '/keys/lb01.pem'
      },
      services: [
        { name: 'haproxy', status: 'stopped', port: 80 },
        { name: 'haproxy', status: 'stopped', port: 443 }
      ],
      tags: ['production', 'loadbalancer', 'haproxy']
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('All');
  const [selectedServerType, setSelectedServerType] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#00FF88';
      case 'warning': return '#FFA500';
      case 'offline': return '#FF3366';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return 'check-circle';
      case 'warning': return 'warning';
      case 'offline': return 'error';
      default: return 'help';
    }
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'Production': return '#FF3366';
      case 'Staging': return '#FFA500';
      case 'Development': return '#00FF88';
      default: return '#666';
    }
  };

  const getServerTypeIcon = (type: string) => {
    switch (type) {
      case 'Web': return 'language';
      case 'Database': return 'storage';
      case 'Application': return 'apps';
      case 'Load Balancer': return 'balance';
      case 'Cache': return 'memory';
      default: return 'computer';
    }
  };

  const formatLastCheck = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getResourceUsageColor = (usage: number) => {
    if (usage >= 90) return '#FF3366';
    if (usage >= 75) return '#FFA500';
    return '#00FF88';
  };

  const handleAddServer = () => {
    setShowAddModal(true);
  };

  const handleSaveServer = (serverData: Server) => {
    if (serverData.id && servers.find(s => s.id === serverData.id)) {
      // Edit existing server
      setServers(prev => prev.map(s => s.id === serverData.id ? serverData : s));
      Alert.alert('Success', `${serverData.name} has been updated.`);
    } else {
      // Add new server
      setServers(prev => [...prev, serverData]);
      Alert.alert('Success', `${serverData.name} has been added.`);
    }
  };

  const handleEditServer = (server: Server) => {
    Alert.alert(
      'Edit Server',
      `Edit ${server.name} configuration?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => console.log(`Edit ${server.name}`) }
      ]
    );
  };

  const handleDeleteServer = (server: Server) => {
    Alert.alert(
      'Delete Server',
      `Are you sure you want to remove ${server.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setServers(prev => prev.filter(s => s.id !== server.id));
            Alert.alert('Success', `${server.name} has been removed.`);
          }
        }
      ]
    );
  };

  const handleServerDetails = (server: Server) => {
    Alert.alert(
      'Server Details',
      `View detailed information for ${server.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => console.log(`View details for ${server.name}`) }
      ]
    );
  };

  const handleBulkAction = (action: string) => {
    if (selectedServers.length === 0) {
      Alert.alert('No Selection', 'Please select servers to perform bulk actions.');
      return;
    }

    Alert.alert(
      `Bulk ${action}`,
      `${action} ${selectedServers.length} selected server(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          onPress: () => {
            console.log(`Bulk ${action} on servers:`, selectedServers);
            setSelectedServers([]);
            setBulkMode(false);
          }
        }
      ]
    );
  };

  const toggleServerSelection = (serverId: string) => {
    setSelectedServers(prev =>
      prev.includes(serverId)
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Refreshed', 'Server status updated successfully.');
    }, 1500);
  };

  const filteredServers = servers.filter(server => {
    const matchesSearch = searchQuery === '' ||
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.ipAddress.includes(searchQuery) ||
      server.osType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEnvironment = selectedEnvironment === 'All' ||
      server.environment === selectedEnvironment;

    const matchesServerType = selectedServerType === 'All' ||
      server.serverType === selectedServerType;

    return matchesSearch && matchesEnvironment && matchesServerType;
  });

  const environments = ['All', 'Production', 'Staging', 'Development'];
  const serverTypes = ['All', 'Web', 'Database', 'Application', 'Load Balancer', 'Cache'];

  const getServerStats = () => {
    const online = servers.filter(s => s.status === 'online').length;
    const warning = servers.filter(s => s.status === 'warning').length;
    const offline = servers.filter(s => s.status === 'offline').length;
    const total = servers.length;

    return { online, warning, offline, total };
  };

  const stats = getServerStats();

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search servers, IPs, OS..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.bulkButton, bulkMode && styles.bulkButtonActive]}
            onPress={() => setBulkMode(!bulkMode)}
          >
            <Icon name="checklist" size={20} color={bulkMode ? "#000" : "#00FF88"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAddServer}>
            <Icon name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          <View style={styles.filterContainer}>
            {environments.map((env) => (
              <TouchableOpacity
                key={env}
                style={[
                  styles.filterTab,
                  selectedEnvironment === env && styles.filterTabActive
                ]}
                onPress={() => setSelectedEnvironment(env)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedEnvironment === env && styles.filterTabTextActive
                ]}>
                  {env}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          <View style={styles.filterContainer}>
            {serverTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterTab,
                  selectedServerType === type && styles.filterTabActive
                ]}
                onPress={() => setSelectedServerType(type)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedServerType === type && styles.filterTabTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Server Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#00FF88' }]}>{stats.online}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FFA500' }]}>{stats.warning}</Text>
            <Text style={styles.statLabel}>Warning</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF3366' }]}>{stats.offline}</Text>
            <Text style={styles.statLabel}>Offline</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Bulk Actions Bar */}
        {bulkMode && (
          <View style={styles.bulkActionsBar}>
            <Text style={styles.bulkSelectionText}>
              {selectedServers.length} selected
            </Text>
            <View style={styles.bulkActions}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('Start')}
              >
                <Icon name="play-arrow" size={16} color="#00FF88" />
                <Text style={styles.bulkActionText}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('Stop')}
              >
                <Icon name="stop" size={16} color="#FF3366" />
                <Text style={styles.bulkActionText}>Stop</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('Update')}
              >
                <Icon name="system-update" size={16} color="#FFA500" />
                <Text style={styles.bulkActionText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Server List */}
        <ScrollView
          style={styles.serverList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00FF88"
              colors={['#00FF88']}
            />
          }
        >
          {filteredServers.map((server) => (
            <TouchableOpacity
              key={server.id}
              style={[
                styles.serverCard,
                selectedServers.includes(server.id) && styles.serverCardSelected
              ]}
              onPress={() => bulkMode ? toggleServerSelection(server.id) : handleServerDetails(server)}
              onLongPress={() => {
                if (!bulkMode) {
                  setBulkMode(true);
                  toggleServerSelection(server.id);
                }
              }}
            >
              {/* Server Header */}
              <View style={styles.serverHeader}>
                <View style={styles.serverMainInfo}>
                  {bulkMode && (
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleServerSelection(server.id)}
                    >
                      <Icon
                        name={selectedServers.includes(server.id) ? "check-box" : "check-box-outline-blank"}
                        size={20}
                        color="#00FF88"
                      />
                    </TouchableOpacity>
                  )}

                  <Icon
                    name={getStatusIcon(server.status)}
                    size={24}
                    color={getStatusColor(server.status)}
                  />

                  <View style={styles.serverBasicInfo}>
                    <View style={styles.serverTitleRow}>
                      <Text style={styles.serverName}>{server.name}</Text>
                      <View style={[
                        styles.environmentBadge,
                        { backgroundColor: getEnvironmentColor(server.environment) + '20' }
                      ]}>
                        <Text style={[
                          styles.environmentText,
                          { color: getEnvironmentColor(server.environment) }
                        ]}>
                          {server.environment}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.serverHostname}>{server.hostname}</Text>
                    <Text style={styles.serverIP}>{server.ipAddress}</Text>

                    <View style={styles.serverTypeRow}>
                      <Icon
                        name={getServerTypeIcon(server.serverType)}
                        size={14}
                        color="#666"
                      />
                      <Text style={styles.serverType}>{server.serverType}</Text>
                      <Text style={styles.serverOS}>{server.osType} {server.osVersion}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.serverActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleServerDetails(server)}
                  >
                    <Icon name="visibility" size={18} color="#00FF88" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditServer(server)}
                  >
                    <Icon name="edit" size={18} color="#FFA500" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteServer(server)}
                  >
                    <Icon name="delete" size={18} color="#FF3366" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Resource Usage */}
              <View style={styles.resourceUsage}>
                <View style={styles.resourceItem}>
                  <Text style={styles.resourceLabel}>CPU</Text>
                  <View style={styles.resourceBar}>
                    <View
                      style={[
                        styles.resourceFill,
                        {
                          width: `${server.cpuUsage}%`,
                          backgroundColor: getResourceUsageColor(server.cpuUsage)
                        }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.resourceValue,
                    { color: getResourceUsageColor(server.cpuUsage) }
                  ]}>
                    {server.cpuUsage}%
                  </Text>
                </View>

                <View style={styles.resourceItem}>
                  <Text style={styles.resourceLabel}>RAM</Text>
                  <View style={styles.resourceBar}>
                    <View
                      style={[
                        styles.resourceFill,
                        {
                          width: `${server.memoryUsage}%`,
                          backgroundColor: getResourceUsageColor(server.memoryUsage)
                        }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.resourceValue,
                    { color: getResourceUsageColor(server.memoryUsage) }
                  ]}>
                    {server.memoryUsage}%
                  </Text>
                </View>

                <View style={styles.resourceItem}>
                  <Text style={styles.resourceLabel}>Disk</Text>
                  <View style={styles.resourceBar}>
                    <View
                      style={[
                        styles.resourceFill,
                        {
                          width: `${server.diskUsage}%`,
                          backgroundColor: getResourceUsageColor(server.diskUsage)
                        }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.resourceValue,
                    { color: getResourceUsageColor(server.diskUsage) }
                  ]}>
                    {server.diskUsage}%
                  </Text>
                </View>
              </View>

              {/* Server Footer */}
              <View style={styles.serverFooter}>
                <View style={styles.serverMetrics}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Uptime</Text>
                    <Text style={styles.metricValue}>{server.uptime}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Last Check</Text>
                    <Text style={styles.metricValue}>{formatLastCheck(server.lastCheck)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Services</Text>
                    <Text style={styles.metricValue}>
                      {server.services.filter(s => s.status === 'running').length}/{server.services.length}
                    </Text>
                  </View>
                </View>

                {/* Service Status Indicators */}
                <View style={styles.serviceIndicators}>
                  {server.services.slice(0, 3).map((service, index) => (
                    <View key={index} style={styles.serviceIndicator}>
                      <View style={[
                        styles.serviceStatus,
                        { backgroundColor: service.status === 'running' ? '#00FF88' : '#FF3366' }
                      ]} />
                      <Text style={styles.serviceName}>{service.name}</Text>
                    </View>
                  ))}
                  {server.services.length > 3 && (
                    <Text style={styles.moreServices}>+{server.services.length - 3}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredServers.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="dns" size={48} color="#666" />
              <Text style={styles.emptyStateText}>No servers found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Try adjusting your search criteria' : 'Add your first server to get started'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add Server Modal */}
        <AddServerModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveServer}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFF',
    marginLeft: 12,
    fontSize: 16,
  },
  bulkButton: {
    width: 48,
    height: 48,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  bulkButtonActive: {
    backgroundColor: '#00FF88',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#00FF88',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScrollView: {
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  filterTab: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterTabActive: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  filterTabText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#000',
  },
  bulkActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  bulkSelectionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  bulkActionText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  serverList: {
    flex: 1,
  },
  serverCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF88',
  },
  serverCardSelected: {
    borderColor: '#00FF88',
    borderWidth: 2,
    backgroundColor: '#0A2A1A',
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  serverMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  serverBasicInfo: {
    marginLeft: 12,
    flex: 1,
  },
  serverTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  environmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  environmentText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  serverHostname: {
    fontSize: 14,
    color: '#00FF88',
    marginBottom: 2,
  },
  serverIP: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  serverTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 8,
  },
  serverOS: {
    fontSize: 12,
    color: '#666',
  },
  serverActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionButton: {
    padding: 6,
    marginLeft: 4,
  },
  resourceUsage: {
    marginBottom: 16,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceLabel: {
    fontSize: 12,
    color: '#666',
    width: 40,
  },
  resourceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  resourceFill: {
    height: '100%',
    borderRadius: 3,
  },
  resourceValue: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 35,
    textAlign: 'right',
  },
  serverFooter: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  serverMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  serviceIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  serviceName: {
    fontSize: 10,
    color: '#666',
  },
  moreServices: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default ServerManagementScreen;
