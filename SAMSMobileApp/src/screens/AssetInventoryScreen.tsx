import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Asset {
  id: string;
  serialNumber: string;
  deviceName: string;
  category: string;
  operatingSystem: string;
  version: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Maintenance';
  location: string;
  lastSeen: string;
  impactedObject?: string;
}

const AssetInventoryScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const assets: Asset[] = [
    {
      id: '1',
      serialNumber: 'SRV-001-2025',
      deviceName: 'SAMS-PROD-01',
      category: 'Server',
      operatingSystem: 'ESX',
      version: '7.0.3',
      status: 'Active',
      location: 'Data Center A',
      lastSeen: '2025-08-27 10:30:00',
      impactedObject: 's6-apache-tomcat'
    },
    {
      id: '2',
      serialNumber: 'WKS-WIN-001',
      deviceName: 'DEV-WORKSTATION-01',
      category: 'Workstation',
      operatingSystem: 'Windows',
      version: '11 Pro',
      status: 'Active',
      location: 'Office Floor 2',
      lastSeen: '2025-08-27 10:25:00'
    },
    {
      id: '3',
      serialNumber: 'LNX-SRV-024',
      deviceName: 'SAMS-DB-01',
      category: 'Database Server',
      operatingSystem: 'Linux',
      version: 'Ubuntu 22.04',
      status: 'Active',
      location: 'Data Center B',
      lastSeen: '2025-08-27 10:28:00'
    },
    {
      id: '4',
      serialNumber: 'XEN-VM-004',
      deviceName: 'TEST-ENV-01',
      category: 'Virtual Machine',
      operatingSystem: 'XEN',
      version: '4.17',
      status: 'Pending',
      location: 'Cloud Region US-East',
      lastSeen: '2025-08-27 09:45:00'
    },
    {
      id: '5',
      serialNumber: 'MAC-DEV-005',
      deviceName: 'DEV-MACBOOK-01',
      category: 'Development',
      operatingSystem: 'Apple',
      version: 'macOS 14.5',
      status: 'Active',
      location: 'Remote Office',
      lastSeen: '2025-08-27 10:15:00'
    }
  ];

  const categories = ['All', 'Server', 'Workstation', 'Database Server', 'Virtual Machine', 'Development'];
  
  const osStats = [
    { name: 'ESX', count: 36, color: '#1f4e79' },
    { name: 'Windows', count: 29, color: '#00BCF2' },
    { name: 'Linux', count: 24, color: '#16a085' },
    { name: 'XEN', count: 4, color: '#f39c12' },
    { name: 'Apple', count: 5, color: '#95a5a6' },
    { name: 'Unix', count: 5, color: '#8e44ad' },
    { name: 'z/OS', count: 2, color: '#e67e22' }
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.operatingSystem.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || asset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#27ae60';
      case 'Inactive': return '#e74c3c';
      case 'Pending': return '#f39c12';
      case 'Maintenance': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const getOSIcon = (os: string) => {
    switch (os.toLowerCase()) {
      case 'windows': return 'desktop-windows';
      case 'linux': return 'storage';
      case 'apple': return 'laptop-mac';
      case 'esx': return 'cloud';
      case 'xen': return 'dns';
      default: return 'computer';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Asset Inventory</Text>
        <Text style={styles.subtitle}>Manage and monitor all devices</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <MaterialIcons name="devices" size={24} color="#4a90e2" />
          <Text style={styles.summaryNumber}>{assets.length}</Text>
          <Text style={styles.summaryLabel}>Total Assets</Text>
        </View>
        <View style={styles.summaryCard}>
          <MaterialIcons name="check-circle" size={24} color="#27ae60" />
          <Text style={styles.summaryNumber}>{assets.filter(a => a.status === 'Active').length}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <MaterialIcons name="warning" size={24} color="#f39c12" />
          <Text style={styles.summaryNumber}>{assets.filter(a => a.status === 'Pending').length}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
      </View>

      {/* Operating System Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Count by Operating System</Text>
        <View style={styles.osStatsContainer}>
          {osStats.map((os, index) => (
            <View key={index} style={styles.osStatItem}>
              <View style={[styles.osIndicator, { backgroundColor: os.color }]} />
              <Text style={styles.osName}>{os.name}: {os.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#95a5a6"
          />
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.selectedCategoryChip
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category && styles.selectedCategoryChipText
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Asset List */}
      <View style={styles.assetListContainer}>
        <Text style={styles.sectionTitle}>
          Assets ({filteredAssets.length})
        </Text>
        {filteredAssets.map((asset) => (
          <TouchableOpacity key={asset.id} style={styles.assetCard}>
            <View style={styles.assetHeader}>
              <MaterialIcons 
                name={getOSIcon(asset.operatingSystem)} 
                size={24} 
                color="#4a90e2" 
              />
              <View style={styles.assetInfo}>
                <Text style={styles.assetName}>{asset.deviceName}</Text>
                <Text style={styles.assetSerial}>{asset.serialNumber}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(asset.status) }]}>
                <Text style={styles.statusText}>{asset.status}</Text>
              </View>
            </View>
            
            <View style={styles.assetDetails}>
              <View style={styles.assetDetailRow}>
                <MaterialIcons name="category" size={16} color="#7f8c8d" />
                <Text style={styles.assetDetailText}>{asset.category}</Text>
              </View>
              <View style={styles.assetDetailRow}>
                <MaterialIcons name="computer" size={16} color="#7f8c8d" />
                <Text style={styles.assetDetailText}>{asset.operatingSystem} {asset.version}</Text>
              </View>
              <View style={styles.assetDetailRow}>
                <MaterialIcons name="location-on" size={16} color="#7f8c8d" />
                <Text style={styles.assetDetailText}>{asset.location}</Text>
              </View>
              <View style={styles.assetDetailRow}>
                <MaterialIcons name="schedule" size={16} color="#7f8c8d" />
                <Text style={styles.assetDetailText}>Last seen: {asset.lastSeen}</Text>
              </View>
              {asset.impactedObject && (
                <View style={styles.assetDetailRow}>
                  <MaterialIcons name="link" size={16} color="#7f8c8d" />
                  <Text style={styles.assetDetailText}>Linked: {asset.impactedObject}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginVertical: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  osStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  osStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  osIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  osName: {
    fontSize: 14,
    color: '#2c3e50',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#2c3e50',
  },
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategoryChip: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  selectedCategoryChipText: {
    color: 'white',
    fontWeight: 'bold',
  },
  assetListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  assetCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  assetInfo: {
    flex: 1,
    marginLeft: 15,
  },
  assetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  assetSerial: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  assetDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  assetDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assetDetailText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
  },
});

export default AssetInventoryScreen;
