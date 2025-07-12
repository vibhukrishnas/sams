/**
 * 🧪 Quality Assurance Dashboard Screen
 * Comprehensive testing overview and production readiness validation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QualityAssurance from '../services/QualityAssurance';
import ProductionReadinessChecklist from '../components/ProductionReadinessChecklist';

interface TestSuite {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility';
  status: 'not-started' | 'running' | 'passed' | 'failed' | 'skipped';
  coverage: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  lastRun: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ProductionReadinessCheck {
  id: string;
  category: 'performance' | 'security' | 'documentation' | 'monitoring' | 'backup' | 'incident-response';
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'not-applicable';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  dueDate: Date;
  completedDate?: Date;
}

const QualityAssuranceScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'coverage' | 'security' | 'readiness'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [qualityReport, setQualityReport] = useState<any>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());

  const qa = QualityAssurance.getInstance();

  useEffect(() => {
    loadQualityData();
  }, []);

  const loadQualityData = () => {
    setTestSuites(qa.getTestSuites());
    setQualityReport(qa.generateQualityReport());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    loadQualityData();
    setRefreshing(false);
  };

  const runTestSuite = async (suiteId: string) => {
    setRunningTests(prev => new Set([...prev, suiteId]));
    
    try {
      await qa.runTestSuite(suiteId);
      loadQualityData();
      Alert.alert('Test Complete', 'Test suite executed successfully');
    } catch (error) {
      Alert.alert('Test Failed', 'Failed to execute test suite');
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(suiteId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
      case 'completed': return '#00FF88';
      case 'running':
      case 'in-progress': return '#00BFFF';
      case 'failed': return '#FF3366';
      case 'pending':
      case 'not-started': return '#666';
      case 'skipped': return '#FFA500';
      default: return '#666';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'unit': return 'science';
      case 'integration': return 'link';
      case 'e2e': return 'timeline';
      case 'performance': return 'speed';
      case 'security': return 'security';
      case 'accessibility': return 'accessibility';
      default: return 'bug-report';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return 'speed';
      case 'security': return 'security';
      case 'documentation': return 'description';
      case 'monitoring': return 'monitor';
      case 'backup': return 'backup';
      case 'incident-response': return 'emergency';
      default: return 'check-circle';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Quality Overview</Text>
      
      {qualityReport && (
        <>
          {/* Quality Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Icon name="assessment" size={24} color="#00FF88" />
              <Text style={styles.summaryValue}>{qualityReport.summary.overallCoverage.toFixed(1)}%</Text>
              <Text style={styles.summaryLabel}>Test Coverage</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Icon name="check-circle" size={24} color="#00BFFF" />
              <Text style={styles.summaryValue}>
                {qualityReport.summary.passedSuites}/{qualityReport.summary.totalSuites}
              </Text>
              <Text style={styles.summaryLabel}>Suites Passed</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Icon name="security" size={24} color="#9C27B0" />
              <Text style={styles.summaryValue}>{qualityReport.security.length}</Text>
              <Text style={styles.summaryLabel}>Security Items</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Icon 
                name={qualityReport.summary.productionReady ? "verified" : "warning"} 
                size={24} 
                color={qualityReport.summary.productionReady ? "#00FF88" : "#FF6B35"} 
              />
              <Text style={[
                styles.summaryValue,
                { color: qualityReport.summary.productionReady ? "#00FF88" : "#FF6B35" }
              ]}>
                {qualityReport.summary.productionReady ? "READY" : "PENDING"}
              </Text>
              <Text style={styles.summaryLabel}>Production</Text>
            </View>
          </View>

          {/* Production Readiness Status */}
          <View style={styles.readinessSection}>
            <Text style={styles.readinessTitle}>Production Readiness</Text>
            <View style={[
              styles.readinessCard,
              { borderLeftColor: qualityReport.summary.productionReady ? '#00FF88' : '#FF6B35' }
            ]}>
              <Icon 
                name={qualityReport.summary.productionReady ? "check-circle" : "warning"} 
                size={32} 
                color={qualityReport.summary.productionReady ? '#00FF88' : '#FF6B35'} 
              />
              <View style={styles.readinessInfo}>
                <Text style={styles.readinessStatus}>
                  {qualityReport.summary.productionReady ? 'Ready for Production' : 'Not Ready for Production'}
                </Text>
                <Text style={styles.readinessDescription}>
                  {qualityReport.summary.criticalIssues > 0 
                    ? `${qualityReport.summary.criticalIssues} critical issues remaining`
                    : 'All quality gates passed'
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Recommendations */}
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsTitle}>Recommendations</Text>
            {qualityReport.recommendations.map((recommendation: string, index: number) => (
              <View key={index} style={styles.recommendationItem}>
                <Icon 
                  name={recommendation.includes('ready') ? "check-circle" : "info"} 
                  size={16} 
                  color={recommendation.includes('ready') ? "#00FF88" : "#00BFFF"} 
                />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderTestSuites = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Test Suites</Text>
      
      {testSuites.map((suite) => (
        <TouchableOpacity
          key={suite.id}
          style={styles.testSuiteCard}
          onPress={() => {
            setSelectedSuite(suite);
            setShowTestModal(true);
          }}
        >
          <View style={styles.suiteHeader}>
            <View style={styles.suiteInfo}>
              <Icon name={getTypeIcon(suite.type)} size={20} color="#00FF88" />
              <Text style={styles.suiteName}>{suite.name}</Text>
            </View>
            <View style={[
              styles.suiteStatusBadge,
              { backgroundColor: getStatusColor(suite.status) + '20' }
            ]}>
              <Text style={[styles.suiteStatusText, { color: getStatusColor(suite.status) }]}>
                {suite.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.suiteMetrics}>
            <View style={styles.suiteMetric}>
              <Text style={styles.metricValue}>{suite.coverage.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Coverage</Text>
            </View>
            <View style={styles.suiteMetric}>
              <Text style={styles.metricValue}>{suite.passedTests}</Text>
              <Text style={styles.metricLabel}>Passed</Text>
            </View>
            <View style={styles.suiteMetric}>
              <Text style={[styles.metricValue, { color: suite.failedTests > 0 ? '#FF3366' : '#FFF' }]}>
                {suite.failedTests}
              </Text>
              <Text style={styles.metricLabel}>Failed</Text>
            </View>
            <View style={styles.suiteMetric}>
              <Text style={styles.metricValue}>{formatDuration(suite.duration)}</Text>
              <Text style={styles.metricLabel}>Duration</Text>
            </View>
          </View>

          <View style={styles.suiteActions}>
            <Text style={styles.lastRunText}>
              Last run: {formatDate(suite.lastRun)}
            </Text>
            <TouchableOpacity
              style={[
                styles.runButton,
                runningTests.has(suite.id) && styles.runButtonDisabled
              ]}
              onPress={() => runTestSuite(suite.id)}
              disabled={runningTests.has(suite.id)}
            >
              <Icon 
                name={runningTests.has(suite.id) ? "hourglass-empty" : "play-arrow"} 
                size={16} 
                color="#000" 
              />
              <Text style={styles.runButtonText}>
                {runningTests.has(suite.id) ? 'Running...' : 'Run Tests'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderCoverage = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Test Coverage</Text>
      
      {qualityReport && (
        <>
          {/* Overall Coverage */}
          <View style={styles.coverageOverview}>
            <Text style={styles.coverageTitle}>Overall Coverage</Text>
            <View style={styles.coverageCircle}>
              <Text style={styles.coveragePercentage}>
                {qualityReport.coverage.overall.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Coverage by Type */}
          <View style={styles.coverageSection}>
            <Text style={styles.coverageSectionTitle}>Coverage by Type</Text>
            {Object.entries(qualityReport.coverage.byType).map(([type, percentage]) => (
              <View key={type} style={styles.coverageRow}>
                <Text style={styles.coverageType}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                <View style={styles.coverageBar}>
                  <View style={[
                    styles.coverageFill,
                    { 
                      width: `${percentage}%`,
                      backgroundColor: percentage >= 90 ? '#00FF88' : percentage >= 80 ? '#FFA500' : '#FF3366'
                    }
                  ]} />
                </View>
                <Text style={styles.coverageValue}>{(percentage as number).toFixed(1)}%</Text>
              </View>
            ))}
          </View>

          {/* Coverage by Module */}
          <View style={styles.coverageSection}>
            <Text style={styles.coverageSectionTitle}>Coverage by Module</Text>
            {Object.entries(qualityReport.coverage.byModule).map(([module, percentage]) => (
              <View key={module} style={styles.coverageRow}>
                <Text style={styles.coverageModule}>{module}</Text>
                <View style={styles.coverageBar}>
                  <View style={[
                    styles.coverageFill,
                    { 
                      width: `${percentage}%`,
                      backgroundColor: percentage >= 90 ? '#00FF88' : percentage >= 80 ? '#FFA500' : '#FF3366'
                    }
                  ]} />
                </View>
                <Text style={styles.coverageValue}>{(percentage as number).toFixed(1)}%</Text>
              </View>
            ))}
          </View>

          {/* Critical Paths */}
          <View style={styles.coverageSection}>
            <Text style={styles.coverageSectionTitle}>Critical Paths</Text>
            {qualityReport.coverage.criticalPaths.map((path: any, index: number) => (
              <View key={index} style={styles.criticalPathRow}>
                <Icon 
                  name={path.covered ? "check-circle" : "error"} 
                  size={16} 
                  color={path.covered ? "#00FF88" : "#FF3366"} 
                />
                <Text style={styles.criticalPathName}>{path.path}</Text>
                <View style={[
                  styles.importanceBadge,
                  { backgroundColor: path.importance === 'critical' ? '#FF3366' : '#FFA500' }
                ]}>
                  <Text style={styles.importanceText}>{path.importance.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Quality Assurance</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Icon name="refresh" size={24} color="#00FF88" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: 'dashboard' },
            { key: 'tests', label: 'Tests', icon: 'science' },
            { key: 'coverage', label: 'Coverage', icon: 'assessment' },
            { key: 'security', label: 'Security', icon: 'security' },
            { key: 'readiness', label: 'Readiness', icon: 'verified' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Icon name={tab.icon} size={14} color={activeTab === tab.key ? "#000" : "#FFF"} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'tests' && renderTestSuites()}
          {activeTab === 'coverage' && renderCoverage()}
          {activeTab === 'security' && (
            <View style={styles.comingSoon}>
              <Icon name="security" size={64} color="#666" />
              <Text style={styles.comingSoonText}>Security Audit</Text>
              <Text style={styles.comingSoonSubtext}>
                Detailed security audit results
              </Text>
            </View>
          )}
          {activeTab === 'readiness' && <ProductionReadinessChecklist />}
        </View>
        {/* Test Suite Details Modal */}
        <Modal
          visible={showTestModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowTestModal(false)}
        >
          <LinearGradient
            colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTestModal(false)}>
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedSuite?.name || 'Test Suite Details'}
              </Text>
              <View style={styles.modalSpacer} />
            </View>

            {selectedSuite && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.suiteDetails}>
                  <View style={styles.suiteDetailHeader}>
                    <Icon name={getTypeIcon(selectedSuite.type)} size={24} color="#00FF88" />
                    <Text style={styles.suiteDetailType}>
                      {selectedSuite.type.toUpperCase()} TESTS
                    </Text>
                  </View>

                  <View style={styles.suiteDetailMetrics}>
                    <View style={styles.detailMetricCard}>
                      <Text style={styles.detailMetricValue}>{selectedSuite.totalTests}</Text>
                      <Text style={styles.detailMetricLabel}>Total Tests</Text>
                    </View>
                    <View style={styles.detailMetricCard}>
                      <Text style={[styles.detailMetricValue, { color: '#00FF88' }]}>
                        {selectedSuite.passedTests}
                      </Text>
                      <Text style={styles.detailMetricLabel}>Passed</Text>
                    </View>
                    <View style={styles.detailMetricCard}>
                      <Text style={[
                        styles.detailMetricValue,
                        { color: selectedSuite.failedTests > 0 ? '#FF3366' : '#FFF' }
                      ]}>
                        {selectedSuite.failedTests}
                      </Text>
                      <Text style={styles.detailMetricLabel}>Failed</Text>
                    </View>
                    <View style={styles.detailMetricCard}>
                      <Text style={[styles.detailMetricValue, { color: '#FFA500' }]}>
                        {selectedSuite.skippedTests}
                      </Text>
                      <Text style={styles.detailMetricLabel}>Skipped</Text>
                    </View>
                  </View>

                  <View style={styles.coverageDetail}>
                    <Text style={styles.coverageDetailTitle}>Test Coverage</Text>
                    <View style={styles.coverageDetailBar}>
                      <View style={[
                        styles.coverageDetailFill,
                        {
                          width: `${selectedSuite.coverage}%`,
                          backgroundColor: selectedSuite.coverage >= 90 ? '#00FF88' :
                                         selectedSuite.coverage >= 80 ? '#FFA500' : '#FF3366'
                        }
                      ]} />
                    </View>
                    <Text style={styles.coverageDetailText}>
                      {selectedSuite.coverage.toFixed(1)}% coverage
                    </Text>
                  </View>

                  <View style={styles.suiteActions}>
                    <TouchableOpacity
                      style={[
                        styles.modalRunButton,
                        runningTests.has(selectedSuite.id) && styles.modalRunButtonDisabled
                      ]}
                      onPress={() => {
                        runTestSuite(selectedSuite.id);
                        setShowTestModal(false);
                      }}
                      disabled={runningTests.has(selectedSuite.id)}
                    >
                      <Icon
                        name={runningTests.has(selectedSuite.id) ? "hourglass-empty" : "play-arrow"}
                        size={20}
                        color="#000"
                      />
                      <Text style={styles.modalRunButtonText}>
                        {runningTests.has(selectedSuite.id) ? 'Running Tests...' : 'Run Test Suite'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  refreshButton: {
    padding: 8,
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
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#00FF88',
  },
  tabText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  readinessSection: {
    marginBottom: 20,
  },
  readinessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  readinessCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  readinessInfo: {
    marginLeft: 16,
    flex: 1,
  },
  readinessStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  readinessDescription: {
    fontSize: 14,
    color: '#666',
  },
  recommendationsSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#FFF',
    marginLeft: 8,
    flex: 1,
  },
  testSuiteCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  suiteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suiteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suiteName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  suiteStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suiteStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  suiteMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  suiteMetric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
  },
  suiteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastRunText: {
    fontSize: 12,
    color: '#666',
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF88',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  runButtonDisabled: {
    backgroundColor: '#333',
  },
  runButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  coverageOverview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  coverageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  coverageCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#00FF88',
  },
  coveragePercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  coverageSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  coverageSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coverageType: {
    fontSize: 14,
    color: '#FFF',
    width: 100,
  },
  coverageModule: {
    fontSize: 14,
    color: '#FFF',
    width: 120,
  },
  coverageBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  coverageFill: {
    height: '100%',
    borderRadius: 4,
  },
  coverageValue: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
    width: 50,
    textAlign: 'right',
  },
  criticalPathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criticalPathName: {
    fontSize: 14,
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  importanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  importanceText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalSpacer: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  suiteDetails: {
    flex: 1,
  },
  suiteDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  suiteDetailType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00FF88',
    marginLeft: 8,
  },
  suiteDetailMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  detailMetricCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  detailMetricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  detailMetricLabel: {
    fontSize: 10,
    color: '#666',
  },
  coverageDetail: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  coverageDetailTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  coverageDetailBar: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    marginBottom: 8,
  },
  coverageDetailFill: {
    height: '100%',
    borderRadius: 6,
  },
  coverageDetailText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modalRunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF88',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  modalRunButtonDisabled: {
    backgroundColor: '#333',
  },
  modalRunButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default QualityAssuranceScreen;
