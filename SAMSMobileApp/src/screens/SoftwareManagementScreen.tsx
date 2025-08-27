import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Software {
  id: string;
  name: string;
  version: string;
  vendor: string;
  installDate: string;
  impactedObject: string;
  category: 'System' | 'Application' | 'Security' | 'Development' | 'Database';
  status: 'Installed' | 'Pending' | 'Failed' | 'Updating';
  size: string;
  license: string;
}

const SoftwareManagementScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);

  const softwareList: Software[] = [
    {
      id: '1',
      name: 'usb-modeswitch',
      version: '20170806-2',
      vendor: 'Open Source',
      installDate: '2020-11-0',
      impactedObject: 's6-apache-tomcat',
      category: 'System',
      status: 'Installed',
      size: '2.3 MB',
      license: 'GPL'
    },
    {
      id: '2',
      name: 'Apache Tomcat',
      version: '9.0.75',
      vendor: 'Apache Foundation',
      installDate: '2025-08-15',
      impactedObject: 'web-server-cluster',
      category: 'Application',
      status: 'Installed',
      size: '12.5 MB',
      license: 'Apache 2.0'
    },
    {
      id: '3',
      name: 'PostgreSQL',
      version: '15.4',
      vendor: 'PostgreSQL Global Development Group',
      installDate: '2025-07-20',
      impactedObject: 'sams-database',
      category: 'Database',
      status: 'Installed',
      size: '45.2 MB',
      license: 'PostgreSQL'
    },
    {
      id: '4',
      name: 'Node.js Runtime',
      version: '18.17.1',
      vendor: 'Node.js Foundation',
      installDate: '2025-08-10',
      impactedObject: 'api-gateway',
      category: 'Development',
      status: 'Installed',
      size: '32.1 MB',
      license: 'MIT'
    },
    {
      id: '5',
      name: 'McAfee VirusScan',
      version: '21.8.0',
      vendor: 'McAfee Inc.',
      installDate: '2025-08-01',
      impactedObject: 'endpoint-protection',
      category: 'Security',
      status: 'Updating',
      size: '156.7 MB',
      license: 'Commercial'
    },
    {
      id: '6',
      name: 'Docker Engine',
      version: '24.0.5',
      vendor: 'Docker Inc.',
      installDate: '2025-07-25',
      impactedObject: 'container-runtime',
      category: 'System',
      status: 'Installed',
      size: '89.3 MB',
      license: 'Apache 2.0'
    }
  ];

  const categories = ['All', 'System', 'Application', 'Security', 'Development', 'Database'];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const filteredSoftware = softwareList.filter(software => {
    const matchesSearch = software.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         software.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         software.version.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || software.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Installed': return '#27ae60';
      case 'Pending': return '#f39c12';
      case 'Failed': return '#e74c3c';
      case 'Updating': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'System': return '#34495e';
      case 'Application': return '#3498db';
      case 'Security': return '#e74c3c';
      case 'Development': return '#16a085';
      case 'Database': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'System': return 'settings';
      case 'Application': return 'apps';
      case 'Security': return 'security';
      case 'Development': return 'code';
      case 'Database': return 'storage';
      default: return 'category';
    }
  };

  const handleSoftwarePress = (software: Software) => {
    setSelectedSoftware(software);
    setShowDetails(true);
  };

  const handleUninstall = (software: Software) => {
    Alert.alert(
      'Uninstall Software',
      `Are you sure you want to uninstall ${software.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Uninstall', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', `${software.name} has been queued for uninstallation.`);
            setShowDetails(false);
          }
        }
      ]
    );
  };

  const categoryStats = categories.slice(1).map(category => ({
    name: category,
    count: softwareList.filter(s => s.category === category).length,
    color: getCategoryColor(category)
  }));

  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Software Management</Text>
          <Text style={styles.subtitle}>Monitor and manage installed software</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <MaterialIcons name="apps" size={24} color="#4a90e2" />
            <Text style={styles.summaryNumber}>{softwareList.length}</Text>
            <Text style={styles.summaryLabel}>Total Software</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialIcons name="check-circle" size={24} color="#27ae60" />
            <Text style={styles.summaryNumber}>
              {softwareList.filter(s => s.status === 'Installed').length}
            </Text>
            <Text style={styles.summaryLabel}>Installed</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialIcons name="update" size={24} color="#3498db" />
            <Text style={styles.summaryNumber}>
              {softwareList.filter(s => s.status === 'Updating').length}
            </Text>
            <Text style={styles.summaryLabel}>Updating</Text>
          </View>
        </View>

        {/* Category Distribution */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Software by Category</Text>
          <View style={styles.categoryStatsContainer}>
            {categoryStats.map((cat, index) => (
              <View key={index} style={styles.categoryStatItem}>
                <MaterialIcons 
                  name={getCategoryIcon(cat.name)} 
                  size={20} 
                  color={cat.color} 
                />
                <Text style={styles.categoryStatText}>{cat.name}: {cat.count}</Text>
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
              placeholder="Search software..."
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

        {/* Software List */}
        <View style={styles.softwareListContainer}>
          <Text style={styles.sectionTitle}>
            Recent Software ({filteredSoftware.length})
          </Text>
          
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Software</Text>
            <Text style={styles.tableHeaderText}>Version</Text>
            <Text style={styles.tableHeaderText}>Object</Text>
            <Text style={styles.tableHeaderText}>Date</Text>
          </View>

          {filteredSoftware.map((software) => (
            <TouchableOpacity 
              key={software.id} 
              style={styles.softwareRow}
              onPress={() => handleSoftwarePress(software)}
            >
              <View style={styles.softwareInfo}>
                <View style={styles.softwareNameContainer}>
                  <MaterialIcons 
                    name={getCategoryIcon(software.category)} 
                    size={16} 
                    color={getCategoryColor(software.category)} 
                  />
                  <Text style={styles.softwareName}>{software.name}</Text>
                </View>
                <Text style={styles.softwareVendor}>{software.vendor}</Text>
              </View>
              
              <Text style={styles.softwareVersion}>{software.version}</Text>
              
              <Text style={styles.impactedObject} numberOfLines={1}>
                {software.impactedObject}
              </Text>
              
              <View style={styles.dateContainer}>
                <Text style={styles.installDate}>{software.installDate}</Text>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(software.status) }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Software Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Software Details</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <MaterialIcons name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          
          {selectedSoftware && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <MaterialIcons 
                    name={getCategoryIcon(selectedSoftware.category)} 
                    size={32} 
                    color={getCategoryColor(selectedSoftware.category)} 
                  />
                  <View style={styles.detailHeaderText}>
                    <Text style={styles.detailSoftwareName}>{selectedSoftware.name}</Text>
                    <Text style={styles.detailVendor}>{selectedSoftware.vendor}</Text>
                  </View>
                  <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedSoftware.status) }]}>
                    <Text style={styles.detailStatusText}>{selectedSoftware.status}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Software Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Version:</Text>
                    <Text style={styles.detailValue}>{selectedSoftware.version}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>{selectedSoftware.category}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Size:</Text>
                    <Text style={styles.detailValue}>{selectedSoftware.size}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>License:</Text>
                    <Text style={styles.detailValue}>{selectedSoftware.license}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Install Date:</Text>
                    <Text style={styles.detailValue}>{selectedSoftware.installDate}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Impacted Object:</Text>
                    <Text style={styles.detailValue}>{selectedSoftware.impactedObject}</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.updateButton}>
                    <MaterialIcons name="update" size={20} color="white" />
                    <Text style={styles.buttonText}>Update</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.uninstallButton}
                    onPress={() => handleUninstall(selectedSoftware)}
                  >
                    <MaterialIcons name="delete" size={20} color="white" />
                    <Text style={styles.buttonText}>Uninstall</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
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
  categoryStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 10,
  },
  categoryStatText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 8,
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
  softwareListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  softwareRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  softwareInfo: {
    flex: 1,
  },
  softwareNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  softwareName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  softwareVendor: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  softwareVersion: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'center',
  },
  impactedObject: {
    flex: 1,
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  installDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailHeaderText: {
    flex: 1,
    marginLeft: 15,
  },
  detailSoftwareName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  detailVendor: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 4,
  },
  detailStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  detailStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  detailLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  detailValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  updateButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  uninstallButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SoftwareManagementScreen;
