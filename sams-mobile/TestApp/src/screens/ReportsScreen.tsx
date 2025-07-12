/**
 * 📊 Reports & Stored Queries Module
 * Comprehensive reporting system with pre-built reports, custom queries, and automation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

interface Report {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'alert' | 'operational' | 'custom';
  type: 'inventory' | 'performance' | 'security' | 'compliance' | 'uptime' | 'cost';
  lastRun: Date;
  status: 'ready' | 'running' | 'completed' | 'failed';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    enabled: boolean;
  };
  parameters?: Record<string, any>;
  dataSource: string[];
  estimatedRunTime: number;
  fileSize?: string;
  recipients?: string[];
}

interface StoredQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  category: 'metrics' | 'alerts' | 'logs' | 'config' | 'custom';
  dataSource: string;
  lastUsed: Date;
  createdBy: string;
  isPublic: boolean;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'select';
    required: boolean;
    options?: string[];
  }>;
}

interface ReportResult {
  id: string;
  reportId: string;
  generatedAt: Date;
  status: 'completed' | 'failed';
  fileUrl?: string;
  fileSize: string;
  format: 'PDF' | 'Excel' | 'CSV';
  downloadCount: number;
}

const ReportsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'queries' | 'results' | 'scheduled'>('reports');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Real API data - loaded from backend
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API Base URL
  const API_BASE_URL = 'http://192.168.1.10:8080/api';

  // Load data from real API
  useEffect(() => {
    loadReportsData();
    loadStoredQueries();
    loadReportResults();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/reports`);
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`);
      }
      const data = await response.json();
      setReports(data);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError('Failed to load reports. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const [storedQueries, setStoredQueries] = useState<StoredQuery[]>([]);
    {
      id: '1',
      name: 'High CPU Usage Servers',
      description: 'Servers with CPU usage above 80% in the last hour',
      query: 'SELECT server_name, avg(cpu_usage) as avg_cpu FROM metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR GROUP BY server_name HAVING avg_cpu > 80 ORDER BY avg_cpu DESC',
      category: 'metrics',
      dataSource: 'Real-time metrics database',
      lastUsed: new Date(Date.now() - 3600000),
      createdBy: 'admin',
      isPublic: true
    },
    {
      id: '2',
      name: 'Critical Alerts Last 24h',
      description: 'All critical alerts from the last 24 hours',
      query: 'SELECT * FROM alerts WHERE severity = "critical" AND timestamp > NOW() - INTERVAL 24 HOUR ORDER BY timestamp DESC',
      category: 'alerts',
      dataSource: 'Alert and incident logs',
      lastUsed: new Date(Date.now() - 7200000),
      createdBy: 'ops-team',
      isPublic: true
    },
    {
      id: '3',
      name: 'Failed Login Attempts',
      description: 'Failed authentication attempts by IP and user',
      query: 'SELECT ip_address, username, COUNT(*) as attempts FROM auth_logs WHERE status = "failed" AND timestamp > NOW() - INTERVAL 1 DAY GROUP BY ip_address, username ORDER BY attempts DESC',
      category: 'logs',
      dataSource: 'User activity logs',
      lastUsed: new Date(Date.now() - 1800000),
      createdBy: 'security',
      isPublic: false
    },
    {
      id: '4',
      name: 'Disk Space Trending',
      description: 'Disk space usage trends for capacity planning',
      query: 'SELECT server_name, DATE(timestamp) as date, AVG(disk_usage) as avg_usage FROM metrics WHERE timestamp > NOW() - INTERVAL 30 DAY GROUP BY server_name, DATE(timestamp) ORDER BY server_name, date',
      category: 'metrics',
      dataSource: 'Historical performance data',
      lastUsed: new Date(Date.now() - 86400000),
      createdBy: 'admin',
      isPublic: true,
      parameters: [
        { name: 'days', type: 'number', required: false },
        { name: 'server_filter', type: 'string', required: false }
      ]
    },
    {
      id: '5',
      name: 'Configuration Changes',
      description: 'Recent configuration changes across all systems',
      query: 'SELECT * FROM config_changes WHERE timestamp > NOW() - INTERVAL 7 DAY ORDER BY timestamp DESC',
      category: 'config',
      dataSource: 'Configuration management database',
      lastUsed: new Date(Date.now() - 259200000),
      createdBy: 'admin',
      isPublic: true
    }
  ]);

  // Report Results Data
  const [reportResults, setReportResults] = useState<ReportResult[]>([
    {
      id: '1',
      reportId: '1',
      generatedAt: new Date(Date.now() - 3600000),
      status: 'completed',
      fileUrl: '/reports/server-inventory-2024-01-15.pdf',
      fileSize: '2.3 MB',
      format: 'PDF',
      downloadCount: 5
    },
    {
      id: '2',
      reportId: '2',
      generatedAt: new Date(Date.now() - 1800000),
      status: 'completed',
      fileUrl: '/reports/resource-utilization-2024-01-15.xlsx',
      fileSize: '1.7 MB',
      format: 'Excel',
      downloadCount: 12
    },
    {
      id: '3',
      reportId: '4',
      generatedAt: new Date(Date.now() - 604800000),
      status: 'completed',
      fileUrl: '/reports/security-audit-2024-01-08.pdf',
      fileSize: '4.1 MB',
      format: 'PDF',
      downloadCount: 8
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#00FF88';
      case 'running': return '#FFA500';
      case 'failed': return '#FF3366';
      case 'ready': return '#666';
      default: return '#666';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'system': return '#00FF88';
      case 'alert': return '#FF3366';
      case 'operational': return '#00BFFF';
      case 'custom': return '#9C27B0';
      default: return '#666';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return 'computer';
      case 'alert': return 'warning';
      case 'operational': return 'business';
      case 'custom': return 'build';
      default: return 'description';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inventory': return 'inventory';
      case 'performance': return 'speed';
      case 'security': return 'security';
      case 'compliance': return 'verified';
      case 'uptime': return 'schedule';
      case 'cost': return 'attach-money';
      default: return 'description';
    }
  };

  const handleRunReport = async (report: Report) => {
    Alert.alert(
      'Generate Report',
      `Generate ${report.name}?\n\nEstimated time: ${report.estimatedRunTime} minutes`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setIsGenerating(true);
            setReports(prev => prev.map(r =>
              r.id === report.id ? { ...r, status: 'running' } : r
            ));

            // Simulate report generation
            setTimeout(() => {
              setReports(prev => prev.map(r =>
                r.id === report.id ? {
                  ...r,
                  status: 'completed',
                  lastRun: new Date(),
                  fileSize: `${(Math.random() * 5 + 1).toFixed(1)} MB`
                } : r
              ));

              // Add to results
              const newResult: ReportResult = {
                id: Date.now().toString(),
                reportId: report.id,
                generatedAt: new Date(),
                status: 'completed',
                fileUrl: `/reports/${report.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
                fileSize: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
                format: 'PDF',
                downloadCount: 0
              };

              setReportResults(prev => [newResult, ...prev]);
              setIsGenerating(false);

              Alert.alert('Success', `${report.name} has been generated successfully.`);
            }, report.estimatedRunTime * 1000);
          }
        }
      ]
    );
  };

  const handleQueryExecute = (query: StoredQuery) => {
    Alert.alert(
      'Execute Query',
      `Execute "${query.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute',
          onPress: () => {
            setStoredQueries(prev => prev.map(q =>
              q.id === query.id ? { ...q, lastUsed: new Date() } : q
            ));
            Alert.alert('Query Executed', 'Query results would be displayed here.');
          }
        }
      ]
    );
  };

  const handleScheduleToggle = (reportId: string) => {
    setReports(prev => prev.map(report =>
      report.id === reportId && report.schedule
        ? {
            ...report,
            schedule: { ...report.schedule, enabled: !report.schedule.enabled }
          }
        : report
    ));
  };

  const handleDownloadResult = (result: ReportResult) => {
    setReportResults(prev => prev.map(r =>
      r.id === result.id ? { ...r, downloadCount: r.downloadCount + 1 } : r
    ));
    Alert.alert('Download Started', `Downloading ${result.fileSize} file...`);
  };

  const getFilteredReports = () => {
    return reports.filter(report => {
      const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  const getFilteredQueries = () => {
    return storedQueries.filter(query => {
      const matchesCategory = selectedCategory === 'all' || query.category === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        query.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        query.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  const categories = ['all', 'system', 'alert', 'operational', 'custom'];
  const queryCategories = ['all', 'metrics', 'alerts', 'logs', 'config', 'custom'];

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'reports', label: 'Reports', icon: 'assessment' },
            { key: 'queries', label: 'Queries', icon: 'storage' },
            { key: 'results', label: 'Results', icon: 'download' },
            { key: 'scheduled', label: 'Scheduled', icon: 'schedule' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Icon name={tab.icon} size={18} color={activeTab === tab.key ? "#000" : "#FFF"} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reports and queries..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => activeTab === 'reports' ? setShowReportModal(true) : setShowQueryBuilder(true)}
          >
            <Icon name="add" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          <View style={styles.categoryTabs}>
            {(activeTab === 'queries' ? queryCategories : categories).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.categoryTabActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.categoryTabTextActive
                ]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {activeTab === 'reports' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Reports Overview */}
            <View style={styles.overviewContainer}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewNumber}>{reports.length}</Text>
                <Text style={styles.overviewLabel}>Total Reports</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewNumber, { color: '#FFA500' }]}>
                  {reports.filter(r => r.status === 'running').length}
                </Text>
                <Text style={styles.overviewLabel}>Running</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewNumber, { color: '#00FF88' }]}>
                  {reports.filter(r => r.schedule?.enabled).length}
                </Text>
                <Text style={styles.overviewLabel}>Scheduled</Text>
              </View>
            </View>

            {/* Reports List */}
            {getFilteredReports().map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportTitleRow}>
                    <Icon
                      name={getTypeIcon(report.type)}
                      size={20}
                      color={getCategoryColor(report.category)}
                    />
                    <Text style={styles.reportName}>{report.name}</Text>
                    <View style={[
                      styles.categoryBadge,
                      { backgroundColor: getCategoryColor(report.category) + '20' }
                    ]}>
                      <Text style={[
                        styles.categoryBadgeText,
                        { color: getCategoryColor(report.category) }
                      ]}>
                        {report.category.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {report.schedule && (
                    <TouchableOpacity
                      style={styles.scheduleToggle}
                      onPress={() => handleScheduleToggle(report.id)}
                    >
                      <Icon
                        name={report.schedule.enabled ? "schedule" : "schedule"}
                        size={16}
                        color={report.schedule.enabled ? "#00FF88" : "#666"}
                      />
                      <Text style={[
                        styles.scheduleText,
                        { color: report.schedule.enabled ? "#00FF88" : "#666" }
                      ]}>
                        {report.schedule.enabled ? 'Scheduled' : 'Manual'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.reportDescription}>{report.description}</Text>

                <View style={styles.reportMeta}>
                  <View style={styles.reportMetaItem}>
                    <Icon name="access-time" size={14} color="#666" />
                    <Text style={styles.reportMetaText}>
                      ~{report.estimatedRunTime} min
                    </Text>
                  </View>

                  <View style={styles.reportMetaItem}>
                    <Icon name="storage" size={14} color="#666" />
                    <Text style={styles.reportMetaText}>
                      {report.dataSource.length} source{report.dataSource.length > 1 ? 's' : ''}
                    </Text>
                  </View>

                  {report.fileSize && (
                    <View style={styles.reportMetaItem}>
                      <Icon name="file-download" size={14} color="#666" />
                      <Text style={styles.reportMetaText}>{report.fileSize}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.reportFooter}>
                  <View style={styles.reportStatus}>
                    <Icon
                      name={report.status === 'completed' ? 'check-circle' :
                            report.status === 'running' ? 'hourglass-empty' :
                            report.status === 'failed' ? 'error' : 'play-circle-outline'}
                      size={16}
                      color={getStatusColor(report.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                      {report.status.toUpperCase()}
                    </Text>
                    <Text style={styles.lastRunText}>
                      Last run: {report.lastRun.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.reportActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, report.status === 'running' && styles.actionButtonDisabled]}
                      onPress={() => handleRunReport(report)}
                      disabled={report.status === 'running'}
                    >
                      <Icon name="play-arrow" size={18} color={report.status === 'running' ? "#666" : "#00FF88"} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                      <Icon name="settings" size={18} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                      <Icon name="share" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'queries' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {getFilteredQueries().map((query) => (
              <View key={query.id} style={styles.queryCard}>
                <View style={styles.queryHeader}>
                  <View style={styles.queryTitleRow}>
                    <Text style={styles.queryName}>{query.name}</Text>
                    <View style={styles.queryBadges}>
                      <View style={[styles.categoryBadge, { backgroundColor: '#00FF88' + '20' }]}>
                        <Text style={[styles.categoryBadgeText, { color: '#00FF88' }]}>
                          {query.category.toUpperCase()}
                        </Text>
                      </View>
                      {!query.isPublic && (
                        <View style={[styles.categoryBadge, { backgroundColor: '#FF3366' + '20' }]}>
                          <Text style={[styles.categoryBadgeText, { color: '#FF3366' }]}>
                            PRIVATE
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.queryDescription}>{query.description}</Text>
                </View>

                <View style={styles.queryContent}>
                  <Text style={styles.queryText}>{query.query}</Text>
                </View>

                <View style={styles.queryMeta}>
                  <View style={styles.queryMetaItem}>
                    <Icon name="storage" size={14} color="#666" />
                    <Text style={styles.queryMetaText}>{query.dataSource}</Text>
                  </View>
                  <View style={styles.queryMetaItem}>
                    <Icon name="person" size={14} color="#666" />
                    <Text style={styles.queryMetaText}>{query.createdBy}</Text>
                  </View>
                  <View style={styles.queryMetaItem}>
                    <Icon name="access-time" size={14} color="#666" />
                    <Text style={styles.queryMetaText}>
                      {query.lastUsed.toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.queryActions}>
                  <TouchableOpacity
                    style={styles.executeButton}
                    onPress={() => handleQueryExecute(query)}
                  >
                    <Icon name="play-arrow" size={16} color="#000" />
                    <Text style={styles.executeButtonText}>Execute</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="edit" size={16} color="#FFA500" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="content-copy" size={16} color="#666" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="delete" size={16} color="#FF3366" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'results' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {reportResults.map((result) => {
              const report = reports.find(r => r.id === result.reportId);
              return (
                <View key={result.id} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <View style={styles.resultInfo}>
                      <Icon name="description" size={20} color="#00FF88" />
                      <View style={styles.resultDetails}>
                        <Text style={styles.resultName}>{report?.name || 'Unknown Report'}</Text>
                        <Text style={styles.resultDate}>
                          Generated: {result.generatedAt.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.formatBadge, { backgroundColor: '#00BFFF' + '20' }]}>
                      <Text style={[styles.formatText, { color: '#00BFFF' }]}>
                        {result.format}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultMeta}>
                    <View style={styles.resultMetaItem}>
                      <Icon name="file-download" size={14} color="#666" />
                      <Text style={styles.resultMetaText}>{result.fileSize}</Text>
                    </View>
                    <View style={styles.resultMetaItem}>
                      <Icon name="download" size={14} color="#666" />
                      <Text style={styles.resultMetaText}>
                        {result.downloadCount} download{result.downloadCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => handleDownloadResult(result)}
                    >
                      <Icon name="download" size={16} color="#000" />
                      <Text style={styles.downloadButtonText}>Download</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                      <Icon name="share" size={16} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                      <Icon name="delete" size={16} color="#FF3366" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'scheduled' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.scheduledHeader}>
              <Text style={styles.scheduledTitle}>Scheduled Reports</Text>
              <Text style={styles.scheduledSubtitle}>
                Automated report generation and distribution
              </Text>
            </View>

            {reports.filter(r => r.schedule?.enabled).map((report) => (
              <View key={report.id} style={styles.scheduledCard}>
                <View style={styles.scheduledInfo}>
                  <Text style={styles.scheduledName}>{report.name}</Text>
                  <Text style={styles.scheduledFrequency}>
                    {report.schedule?.frequency} at {report.schedule?.time}
                  </Text>
                  {report.recipients && (
                    <Text style={styles.scheduledRecipients}>
                      Recipients: {report.recipients.join(', ')}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.scheduleToggleButton}
                  onPress={() => handleScheduleToggle(report.id)}
                >
                  <Icon name="schedule" size={20} color="#00FF88" />
                </TouchableOpacity>
              </View>
            ))}

            {reports.filter(r => r.schedule?.enabled).length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="schedule" size={48} color="#666" />
                <Text style={styles.emptyStateText}>No Scheduled Reports</Text>
                <Text style={styles.emptyStateSubtext}>
                  Enable scheduling for reports to automate generation
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Query Builder Modal */}
        <Modal
          visible={showQueryBuilder}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowQueryBuilder(false)}
        >
          <LinearGradient
            colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowQueryBuilder(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Query Builder</Text>
              <TouchableOpacity style={styles.modalSaveButton}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.queryBuilderContent}>
              <View style={styles.emptyState}>
                <Icon name="code" size={48} color="#666" />
                <Text style={styles.emptyStateText}>Visual Query Builder</Text>
                <Text style={styles.emptyStateSubtext}>
                  Drag and drop interface for building custom queries
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Modal>
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
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#00FF88',
  },
  tabText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFF',
    marginLeft: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#00FF88',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  categoryTab: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryTabActive: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  categoryTabText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    marginTop: 16,
  },
  overviewCard: {
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
  },
  reportCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF88',
  },
  reportHeader: {
    marginBottom: 12,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  scheduleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '600',
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  reportMetaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    marginRight: 8,
  },
  lastRunText: {
    fontSize: 11,
    color: '#666',
  },
  reportActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  queryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  queryHeader: {
    marginBottom: 12,
  },
  queryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  queryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  queryBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  queryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  queryContent: {
    backgroundColor: '#0A0A0A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  queryText: {
    fontSize: 12,
    color: '#00FF88',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  queryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  queryMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  queryMetaText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  queryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  executeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  executeButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  resultCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultDetails: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 12,
    color: '#666',
  },
  formatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  formatText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  resultMetaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  scheduledHeader: {
    marginBottom: 20,
    marginTop: 16,
  },
  scheduledTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  scheduledSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  scheduledCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduledInfo: {
    flex: 1,
  },
  scheduledName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  scheduledFrequency: {
    fontSize: 14,
    color: '#00FF88',
    marginBottom: 4,
  },
  scheduledRecipients: {
    fontSize: 12,
    color: '#666',
  },
  scheduleToggleButton: {
    padding: 8,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalSaveButton: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#000',
    fontWeight: 'bold',
  },
  queryBuilderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReportsScreen;
