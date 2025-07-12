import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getReports, addReport} from '../../utils/storage';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    query: '',
    description: '',
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const reportList = await getReports();
      setReports(reportList);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleSaveReport = async () => {
    if (!formData.name || !formData.query) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const reportData = {
        id: selectedReport?.id || Date.now().toString(),
        name: formData.name,
        query: formData.query,
        description: formData.description,
        createdAt: selectedReport?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastRun: null,
        runCount: 0,
      };

      await addReport(reportData);
      setModalVisible(false);
      resetForm();
      await loadReports();
      
      Alert.alert(
        'Success',
        selectedReport ? 'Report updated successfully' : 'Report saved successfully'
      );
    } catch (error) {
      console.error('Error saving report:', error);
      Alert.alert('Error', 'Failed to save report');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      query: '',
      description: '',
    });
    setSelectedReport(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (report) => {
    setFormData({
      name: report.name,
      query: report.query,
      description: report.description || '',
    });
    setSelectedReport(report);
    setModalVisible(true);
  };

  const runReport = (report) => {
    Alert.alert(
      'Run Report',
      `Execute "${report.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Run',
          onPress: () => {
            // Simulate report execution
            Alert.alert('Success', 'Report executed successfully');
          },
        },
      ]
    );
  };

  const renderReportCard = (report) => (
    <View key={report.id} style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportName}>{report.name}</Text>
          <Text style={styles.reportDescription}>{report.description}</Text>
        </View>
        <View style={styles.reportActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => runReport(report)}>
            <Icon name="play-arrow" size={20} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(report)}>
            <Icon name="edit" size={20} color="#1e3a8a" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.reportDetails}>
        <Text style={styles.reportQuery}>{report.query}</Text>
        <View style={styles.reportStats}>
          <Text style={styles.reportStat}>
            Runs: {report.runCount || 0}
          </Text>
          <Text style={styles.reportStat}>
            Last run: {report.lastRun ? new Date(report.lastRun).toLocaleDateString() : 'Never'}
          </Text>
        </View>
      </View>
    </View>
  );

  const predefinedQueries = [
    {
      name: 'Server Status Overview',
      query: 'SELECT server_name, status, last_check FROM servers ORDER BY status',
      description: 'Overview of all server statuses',
    },
    {
      name: 'High CPU Usage',
      query: 'SELECT * FROM metrics WHERE cpu_usage > 80 ORDER BY cpu_usage DESC',
      description: 'Servers with high CPU usage',
    },
    {
      name: 'Disk Space Alert',
      query: 'SELECT * FROM metrics WHERE disk_usage > 90 ORDER BY disk_usage DESC',
      description: 'Servers with low disk space',
    },
    {
      name: 'Recent Alerts',
      query: 'SELECT * FROM alerts WHERE created_at > NOW() - INTERVAL 24 HOUR',
      description: 'Alerts from the last 24 hours',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Queries</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Stored Reports */}
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stored Reports</Text>
          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="assessment" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Reports Found</Text>
              <Text style={styles.emptyMessage}>
                Create your first report to start monitoring
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                <Text style={styles.emptyButtonText}>Create Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            reports.map(renderReportCard)
          )}
        </View>

        {/* Predefined Queries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Predefined Queries</Text>
          <View style={styles.predefinedGrid}>
            {predefinedQueries.map((query, index) => (
              <TouchableOpacity
                key={index}
                style={styles.predefinedCard}
                onPress={() => {
                  setFormData({
                    name: query.name,
                    query: query.query,
                    description: query.description,
                  });
                  setModalVisible(true);
                }}>
                <Icon name="query-stats" size={24} color="#1e3a8a" />
                <Text style={styles.predefinedTitle}>{query.name}</Text>
                <Text style={styles.predefinedDesc}>{query.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedReport ? 'Edit Report' : 'Create Report'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Report Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Enter report name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SQL Query *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.query}
                  onChangeText={(text) => setFormData({...formData, query: text})}
                  placeholder="SELECT * FROM servers WHERE status = 'offline'"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                  placeholder="Optional description"
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveReport}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#1e3a8a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  reportActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  reportDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  reportQuery: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportStat: {
    fontSize: 12,
    color: '#9ca3af',
  },
  predefinedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  predefinedCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  predefinedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  predefinedDesc: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Reports; 