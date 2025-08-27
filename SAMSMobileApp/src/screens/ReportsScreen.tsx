import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Report {
  id: string;
  name: string;
  description: string;
  lastRun: string;
  category: string;
}

interface Query {
  id: string;
  name: string;
  sql: string;
  description: string;
  category: string;
}

const ReportsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'queries'>('reports');
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [queryResult, setQueryResult] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const reports: Report[] = [
    {
      id: '1',
      name: 'Asset Utilization Report',
      description: 'Monthly asset utilization and performance metrics',
      lastRun: '2025-08-27 09:00:00',
      category: 'Operations'
    },
    {
      id: '2',
      name: 'System Health Summary',
      description: 'Comprehensive system health and uptime report',
      lastRun: '2025-08-27 08:30:00',
      category: 'Monitoring'
    },
    {
      id: '3',
      name: 'User Activity Analysis',
      description: 'User engagement and activity patterns',
      lastRun: '2025-08-26 18:00:00',
      category: 'Analytics'
    },
    {
      id: '4',
      name: 'Security Audit Log',
      description: 'Security events and access control audit',
      lastRun: '2025-08-26 17:45:00',
      category: 'Security'
    },
    {
      id: '5',
      name: 'Performance Metrics',
      description: 'System performance and resource utilization',
      lastRun: '2025-08-27 10:00:00',
      category: 'Performance'
    }
  ];

  const queries: Query[] = [
    {
      id: '1',
      name: 'Active Users Count',
      sql: 'SELECT COUNT(*) as active_users FROM users WHERE last_login > DATE_SUB(NOW(), INTERVAL 30 DAY)',
      description: 'Count of users active in the last 30 days',
      category: 'Users'
    },
    {
      id: '2',
      name: 'System Errors Today',
      sql: 'SELECT COUNT(*) as error_count FROM system_logs WHERE log_level = "ERROR" AND DATE(created_at) = CURDATE()',
      description: 'Number of system errors logged today',
      category: 'Monitoring'
    },
    {
      id: '3',
      name: 'Top Asset Categories',
      sql: 'SELECT category, COUNT(*) as count FROM assets GROUP BY category ORDER BY count DESC LIMIT 10',
      description: 'Most common asset categories',
      category: 'Assets'
    },
    {
      id: '4',
      name: 'Server Resource Usage',
      sql: 'SELECT server_name, AVG(cpu_usage) as avg_cpu, AVG(memory_usage) as avg_memory FROM server_metrics WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) GROUP BY server_name',
      description: 'Average resource usage by server in last 24h',
      category: 'Performance'
    },
    {
      id: '5',
      name: 'Failed Login Attempts',
      sql: 'SELECT COUNT(*) as failed_attempts FROM auth_logs WHERE status = "failed" AND DATE(created_at) = CURDATE()',
      description: 'Failed authentication attempts today',
      category: 'Security'
    }
  ];

  const executeQuery = async (query: Query) => {
    setSelectedQuery(query);
    setIsExecuting(true);
    setShowQueryModal(true);

    // Simulate query execution
    setTimeout(() => {
      const mockResults = {
        '1': 'active_users\n1247',
        '2': 'error_count\n3',
        '3': 'category | count\nServers | 45\nNetworking | 23\nStorage | 18\nSecurity | 12\nMonitoring | 8',
        '4': 'server_name | avg_cpu | avg_memory\nSAMS-PROD-01 | 45.2 | 62.1\nSAMS-PROD-02 | 38.7 | 55.3\nSAMS-DB-01 | 72.1 | 78.5',
        '5': 'failed_attempts\n12'
      };

      setQueryResult(mockResults[query.id as keyof typeof mockResults] || 'No data available');
      setIsExecuting(false);
    }, 2000);
  };

  const generateReport = (report: Report) => {
    Alert.alert(
      'Generate Report',
      `Generate ${report.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate', 
          onPress: () => {
            Alert.alert('Success', 'Report generation started. You will be notified when complete.');
          }
        }
      ]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Operations': '#3498db',
      'Monitoring': '#27ae60',
      'Analytics': '#9b59b6',
      'Security': '#e74c3c',
      'Performance': '#f39c12',
      'Users': '#1abc9c',
      'Assets': '#34495e'
    };
    return colors[category as keyof typeof colors] || '#95a5a6';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Queries</Text>
        <Text style={styles.subtitle}>Generate reports and execute stored queries</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'queries' && styles.activeTab]}
          onPress={() => setActiveTab('queries')}
        >
          <Text style={[styles.tabText, activeTab === 'queries' && styles.activeTabText]}>
            Stored Queries
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'reports' ? (
          <View style={styles.reportsContainer}>
            {reports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportName}>{report.name}</Text>
                    <Text style={styles.reportDescription}>{report.description}</Text>
                    <Text style={styles.reportLastRun}>Last run: {report.lastRun}</Text>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(report.category) }]}>
                    <Text style={styles.categoryText}>{report.category}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => generateReport(report)}
                >
                  <MaterialIcons name="description" size={20} color="white" />
                  <Text style={styles.generateButtonText}>Generate Report</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.queriesContainer}>
            {queries.map((query) => (
              <View key={query.id} style={styles.queryCard}>
                <View style={styles.queryHeader}>
                  <View style={styles.queryInfo}>
                    <Text style={styles.queryName}>{query.name}</Text>
                    <Text style={styles.queryDescription}>{query.description}</Text>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(query.category) }]}>
                    <Text style={styles.categoryText}>{query.category}</Text>
                  </View>
                </View>
                <View style={styles.sqlContainer}>
                  <Text style={styles.sqlText} numberOfLines={2}>
                    {query.sql}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.executeQueryButton}
                  onPress={() => executeQuery(query)}
                >
                  <MaterialIcons name="play-arrow" size={20} color="white" />
                  <Text style={styles.executeQueryButtonText}>Execute Query</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showQueryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Query Results</Text>
            <TouchableOpacity onPress={() => setShowQueryModal(false)}>
              <MaterialIcons name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          
          {selectedQuery && (
            <View style={styles.modalContent}>
              <Text style={styles.queryModalName}>{selectedQuery.name}</Text>
              <Text style={styles.queryModalDescription}>{selectedQuery.description}</Text>
              
              <View style={styles.sqlModalContainer}>
                <Text style={styles.sqlModalLabel}>SQL Query:</Text>
                <Text style={styles.sqlModalText}>{selectedQuery.sql}</Text>
              </View>

              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Results:</Text>
                {isExecuting ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Executing query...</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.resultScrollView}>
                    <Text style={styles.resultText}>{queryResult}</Text>
                  </ScrollView>
                )}
              </View>
            </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4a90e2',
  },
  tabText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  reportsContainer: {
    padding: 20,
  },
  queriesContainer: {
    padding: 20,
  },
  reportCard: {
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
  queryCard: {
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reportInfo: {
    flex: 1,
    marginRight: 10,
  },
  queryInfo: {
    flex: 1,
    marginRight: 10,
  },
  reportName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  queryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  reportDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  queryDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  reportLastRun: {
    fontSize: 12,
    color: '#95a5a6',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sqlContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  sqlText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#2c3e50',
  },
  generateButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  executeQueryButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  executeQueryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
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
  queryModalName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  queryModalDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  sqlModalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  sqlModalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  sqlModalText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 5,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  resultScrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    padding: 10,
  },
  resultText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#2c3e50',
  },
});

export default ReportsScreen;
