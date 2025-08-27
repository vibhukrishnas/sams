import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DuplicateData {
  id: string;
  duplicateType: string;
  serialNumbers: string[];
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  detectedDate: string;
  affectedDevices: number;
  status: 'Active' | 'Resolved' | 'Investigating' | 'Ignored';
  category: 'Hardware' | 'Software' | 'Network' | 'User';
}

const DuplicateDataScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('All');

  const duplicateData: DuplicateData[] = [
    {
      id: '1',
      duplicateType: 'Serial Numbers',
      serialNumbers: ['dummy_device_001', 'SRV-001-2025', 'WKS-WIN-001'],
      description: 'Multiple devices reporting the same serial number',
      severity: 'High',
      detectedDate: '2025-08-26',
      affectedDevices: 3,
      status: 'Active',
      category: 'Hardware'
    },
    {
      id: '2',
      duplicateType: 'MAC Addresses',
      serialNumbers: ['00:1B:44:11:3A:B7', '00:1B:44:11:3A:B7'],
      description: 'Duplicate MAC addresses detected on network',
      severity: 'Critical',
      detectedDate: '2025-08-25',
      affectedDevices: 2,
      status: 'Investigating',
      category: 'Network'
    },
    {
      id: '3',
      duplicateType: 'Software Licenses',
      serialNumbers: ['OFFICE-365-001', 'OFFICE-365-001', 'OFFICE-365-001'],
      description: 'Same license key used on multiple devices',
      severity: 'Medium',
      detectedDate: '2025-08-24',
      affectedDevices: 3,
      status: 'Active',
      category: 'Software'
    },
    {
      id: '4',
      duplicateType: 'User Accounts',
      serialNumbers: ['john.doe@company.com', 'j.doe@company.com'],
      description: 'Potential duplicate user accounts detected',
      severity: 'Low',
      detectedDate: '2025-08-23',
      affectedDevices: 2,
      status: 'Resolved',
      category: 'User'
    },
    {
      id: '5',
      duplicateType: 'IP Addresses',
      serialNumbers: ['192.168.1.100', '192.168.1.100'],
      description: 'Static IP address conflict detected',
      severity: 'High',
      detectedDate: '2025-08-22',
      affectedDevices: 2,
      status: 'Active',
      category: 'Network'
    }
  ];

  const severityLevels = ['All', 'Low', 'Medium', 'High', 'Critical'];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const filteredData = duplicateData.filter(item => {
    const matchesSearch = item.duplicateType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.serialNumbers.some(sn => sn.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSeverity = selectedSeverity === 'All' || item.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return '#27ae60';
      case 'Medium': return '#f39c12';
      case 'High': return '#e67e22';
      case 'Critical': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#e74c3c';
      case 'Resolved': return '#27ae60';
      case 'Investigating': return '#f39c12';
      case 'Ignored': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Hardware': return 'memory';
      case 'Software': return 'apps';
      case 'Network': return 'wifi';
      case 'User': return 'person';
      default: return 'error';
    }
  };

  const handleResolve = (item: DuplicateData) => {
    Alert.alert(
      'Resolve Duplicate',
      `Mark "${item.duplicateType}" as resolved?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resolve', 
          onPress: () => {
            Alert.alert('Success', 'Duplicate data marked as resolved.');
          }
        }
      ]
    );
  };

  const handleIgnore = (item: DuplicateData) => {
    Alert.alert(
      'Ignore Duplicate',
      `Ignore "${item.duplicateType}" duplicate?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Ignore', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Duplicate data marked as ignored.');
          }
        }
      ]
    );
  };

  const severityStats = severityLevels.slice(1).map(severity => ({
    name: severity,
    count: duplicateData.filter(d => d.severity === severity).length,
    color: getSeverityColor(severity)
  }));

  const categoryStats = ['Hardware', 'Software', 'Network', 'User'].map(category => ({
    name: category,
    count: duplicateData.filter(d => d.category === category).length,
    color: getSeverityColor(duplicateData.find(d => d.category === category)?.severity || 'Medium')
  }));

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Duplicate Data Management</Text>
        <Text style={styles.subtitle}>Identify and resolve data duplicates</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <MaterialIcons name="content-copy" size={24} color="#e74c3c" />
          <Text style={styles.summaryNumber}>{duplicateData.length}</Text>
          <Text style={styles.summaryLabel}>Total Duplicates</Text>
        </View>
        <View style={styles.summaryCard}>
          <MaterialIcons name="warning" size={24} color="#f39c12" />
          <Text style={styles.summaryNumber}>
            {duplicateData.filter(d => d.status === 'Active').length}
          </Text>
          <Text style={styles.summaryLabel}>Active Issues</Text>
        </View>
        <View style={styles.summaryCard}>
          <MaterialIcons name="check-circle" size={24} color="#27ae60" />
          <Text style={styles.summaryNumber}>
            {duplicateData.filter(d => d.status === 'Resolved').length}
          </Text>
          <Text style={styles.summaryLabel}>Resolved</Text>
        </View>
      </View>

      {/* Severity Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Duplicates by Severity</Text>
        <View style={styles.statsContainer}>
          {severityStats.map((item, index) => (
            <View key={index} style={styles.statItem}>
              <View style={[styles.statIndicator, { backgroundColor: item.color }]} />
              <Text style={styles.statText}>{item.name}: {item.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Category Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Duplicates by Category</Text>
        <View style={styles.statsContainer}>
          {categoryStats.map((item, index) => (
            <View key={index} style={styles.statItem}>
              <MaterialIcons 
                name={getCategoryIcon(item.name)} 
                size={16} 
                color={item.color} 
              />
              <Text style={styles.statText}>{item.name}: {item.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#7f8c8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search duplicates..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#95a5a6"
          />
        </View>
      </View>

      {/* Severity Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {severityLevels.map((severity) => (
          <TouchableOpacity
            key={severity}
            style={[
              styles.filterChip,
              selectedSeverity === severity && styles.selectedFilterChip
            ]}
            onPress={() => setSelectedSeverity(severity)}
          >
            <Text style={[
              styles.filterChipText,
              selectedSeverity === severity && styles.selectedFilterChipText
            ]}>
              {severity}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Duplicate Data List */}
      <View style={styles.duplicateListContainer}>
        <Text style={styles.sectionTitle}>
          Duplicate Data ({filteredData.length})
        </Text>

        {filteredData.map((item) => (
          <View key={item.id} style={styles.duplicateCard}>
            <View style={styles.duplicateHeader}>
              <MaterialIcons 
                name={getCategoryIcon(item.category)} 
                size={24} 
                color={getSeverityColor(item.severity)} 
              />
              <View style={styles.duplicateInfo}>
                <Text style={styles.duplicateType}>{item.duplicateType}</Text>
                <Text style={styles.duplicateDescription}>{item.description}</Text>
              </View>
              <View style={styles.duplicateBadges}>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                  <Text style={styles.badgeText}>{item.severity}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.duplicateDetails}>
              <View style={styles.detailRow}>
                <MaterialIcons name="calendar-today" size={16} color="#7f8c8d" />
                <Text style={styles.detailText}>Detected: {item.detectedDate}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="devices" size={16} color="#7f8c8d" />
                <Text style={styles.detailText}>Affected Devices: {item.affectedDevices}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="category" size={16} color="#7f8c8d" />
                <Text style={styles.detailText}>Category: {item.category}</Text>
              </View>
            </View>

            <View style={styles.serialNumbersContainer}>
              <Text style={styles.serialNumbersTitle}>Duplicate Identifiers:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.serialNumbers.map((serial, index) => (
                  <View key={index} style={styles.serialChip}>
                    <Text style={styles.serialText}>{serial}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {item.status === 'Active' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.resolveButton}
                  onPress={() => handleResolve(item)}
                >
                  <MaterialIcons name="check" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.ignoreButton}
                  onPress={() => handleIgnore(item)}
                >
                  <MaterialIcons name="visibility-off" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Ignore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.viewButton}>
                  <MaterialIcons name="visibility" size={16} color="#4a90e2" />
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  statIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statText: {
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
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedFilterChip: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  filterChipText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  selectedFilterChipText: {
    color: 'white',
    fontWeight: 'bold',
  },
  duplicateListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  duplicateCard: {
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
  duplicateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  duplicateInfo: {
    flex: 1,
    marginLeft: 15,
  },
  duplicateType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  duplicateDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  duplicateBadges: {
    alignItems: 'flex-end',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  duplicateDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  serialNumbersContainer: {
    marginBottom: 15,
  },
  serialNumbersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  serialChip: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  serialText: {
    fontSize: 12,
    color: '#2c3e50',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resolveButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginRight: 5,
    justifyContent: 'center',
  },
  ignoreButton: {
    backgroundColor: '#95a5a6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4a90e2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginLeft: 5,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  viewButtonText: {
    color: '#4a90e2',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default DuplicateDataScreen;
