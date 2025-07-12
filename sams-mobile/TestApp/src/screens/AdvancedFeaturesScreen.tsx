/**
 * 🚀 Advanced Features & Integrations Module
 * Machine Learning, AI, Third-party integrations, and Compliance features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

interface MLPrediction {
  id: string;
  type: 'capacity' | 'anomaly' | 'performance' | 'failure' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  timeframe: string;
  recommendation: string;
  metrics: Record<string, number>;
  createdAt: Date;
}

interface Integration {
  id: string;
  name: string;
  type: 'itsm' | 'monitoring' | 'communication' | 'security';
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'configuring';
  enabled: boolean;
  lastSync: Date;
  configuration: Record<string, any>;
  features: string[];
  metrics: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
  };
}

interface ComplianceReport {
  id: string;
  framework: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  score: number;
  lastAssessment: Date;
  requirements: Array<{
    id: string;
    name: string;
    status: 'met' | 'not-met' | 'partial';
    description: string;
  }>;
}

interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'data-access' | 'network' | 'vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  status: 'open' | 'investigating' | 'resolved';
  affectedSystems: string[];
}

const AdvancedFeaturesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ml' | 'integrations' | 'compliance' | 'security'>('ml');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [mlEnabled, setMlEnabled] = useState(true);
  const [autoRemediation, setAutoRemediation] = useState(false);

  // Machine Learning Predictions Data
  const [mlPredictions] = useState<MLPrediction[]>([
    {
      id: '1',
      type: 'capacity',
      title: 'Database Storage Capacity Warning',
      description: 'Database storage will reach 90% capacity in approximately 14 days based on current growth trends.',
      confidence: 0.87,
      impact: 'high',
      timeframe: '14 days',
      recommendation: 'Consider adding 500GB storage or implementing data archival policies.',
      metrics: { current_usage: 78.5, growth_rate: 2.3, predicted_usage: 90 },
      createdAt: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      type: 'anomaly',
      title: 'Unusual Network Traffic Pattern',
      description: 'Detected 340% increase in outbound traffic from web servers during off-peak hours.',
      confidence: 0.92,
      impact: 'medium',
      timeframe: 'Current',
      recommendation: 'Investigate potential data exfiltration or compromised systems.',
      metrics: { normal_traffic: 2.1, current_traffic: 7.2, anomaly_score: 0.92 },
      createdAt: new Date(Date.now() - 1800000)
    },
    {
      id: '3',
      type: 'performance',
      title: 'API Response Time Degradation',
      description: 'Machine learning model predicts 25% increase in API response times within 48 hours.',
      confidence: 0.74,
      impact: 'medium',
      timeframe: '48 hours',
      recommendation: 'Scale API servers or optimize database queries to prevent performance issues.',
      metrics: { current_response_time: 245, predicted_response_time: 306, confidence: 0.74 },
      createdAt: new Date(Date.now() - 7200000)
    },
    {
      id: '4',
      type: 'failure',
      title: 'Hard Drive Failure Prediction',
      description: 'SMART data analysis indicates 78% probability of disk failure on DB-Server-02 within 7 days.',
      confidence: 0.78,
      impact: 'critical',
      timeframe: '7 days',
      recommendation: 'Schedule immediate disk replacement during next maintenance window.',
      metrics: { smart_score: 23, failure_probability: 0.78, days_remaining: 7 },
      createdAt: new Date(Date.now() - 10800000)
    }
  ]);

  // Third-party Integrations Data
  const [integrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'ServiceNow ITSM',
      type: 'itsm',
      provider: 'ServiceNow',
      status: 'connected',
      enabled: true,
      lastSync: new Date(Date.now() - 300000),
      configuration: {
        instance_url: 'https://company.service-now.com',
        api_version: 'v1',
        auto_ticket_creation: true
      },
      features: ['Ticket Creation', 'Status Sync', 'Priority Mapping', 'SLA Tracking'],
      metrics: { totalRequests: 1247, successRate: 98.2, avgResponseTime: 340 }
    },
    {
      id: '2',
      name: 'Prometheus Metrics',
      type: 'monitoring',
      provider: 'Prometheus',
      status: 'connected',
      enabled: true,
      lastSync: new Date(Date.now() - 60000),
      configuration: {
        endpoint: 'https://prometheus.company.com:9090',
        scrape_interval: '15s',
        retention: '30d'
      },
      features: ['Metrics Ingestion', 'Alert Rules', 'Query API', 'Federation'],
      metrics: { totalRequests: 45623, successRate: 99.7, avgResponseTime: 45 }
    },
    {
      id: '3',
      name: 'Slack Notifications',
      type: 'communication',
      provider: 'Slack',
      status: 'connected',
      enabled: true,
      lastSync: new Date(Date.now() - 120000),
      configuration: {
        webhook_url: 'https://hooks.slack.com/services/...',
        default_channel: '#operations',
        mention_on_critical: true
      },
      features: ['Alert Notifications', 'Channel Routing', 'Interactive Messages', 'Thread Updates'],
      metrics: { totalRequests: 892, successRate: 99.1, avgResponseTime: 156 }
    },
    {
      id: '4',
      name: 'Grafana Dashboards',
      type: 'monitoring',
      provider: 'Grafana',
      status: 'connected',
      enabled: true,
      lastSync: new Date(Date.now() - 180000),
      configuration: {
        url: 'https://grafana.company.com',
        api_key: '***masked***',
        default_dashboard: 'infrastructure-overview'
      },
      features: ['Dashboard Embedding', 'Annotation Sync', 'Alert Integration', 'Panel API'],
      metrics: { totalRequests: 2341, successRate: 97.8, avgResponseTime: 234 }
    },
    {
      id: '5',
      name: 'PagerDuty Incidents',
      type: 'itsm',
      provider: 'PagerDuty',
      status: 'error',
      enabled: false,
      lastSync: new Date(Date.now() - 3600000),
      configuration: {
        api_key: '***masked***',
        service_id: 'PXXXXXX',
        escalation_policy: 'EXXXXXX'
      },
      features: ['Incident Creation', 'Escalation Management', 'On-call Scheduling', 'Response Tracking'],
      metrics: { totalRequests: 156, successRate: 87.2, avgResponseTime: 567 }
    }
  ]);

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Advanced Features</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowConfigModal(true)}
          >
            <Icon name="settings" size={24} color="#00FF88" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'ml', label: 'AI/ML', icon: 'psychology' },
            { key: 'integrations', label: 'Integrations', icon: 'extension' },
            { key: 'compliance', label: 'Compliance', icon: 'verified' },
            { key: 'security', label: 'Security', icon: 'security' }
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

        {activeTab === 'ml' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* ML Controls */}
            <View style={styles.controlsSection}>
              <View style={styles.controlItem}>
                <Text style={styles.controlLabel}>Machine Learning Engine</Text>
                <Switch
                  value={mlEnabled}
                  onValueChange={setMlEnabled}
                  trackColor={{ false: '#333', true: '#00FF88' }}
                  thumbColor={mlEnabled ? '#FFF' : '#666'}
                />
              </View>
              <View style={styles.controlItem}>
                <Text style={styles.controlLabel}>Auto-Remediation</Text>
                <Switch
                  value={autoRemediation}
                  onValueChange={setAutoRemediation}
                  trackColor={{ false: '#333', true: '#00FF88' }}
                  thumbColor={autoRemediation ? '#FFF' : '#666'}
                />
              </View>
            </View>

            {/* ML Predictions */}
            <Text style={styles.sectionTitle}>AI Predictions & Insights</Text>
            {mlPredictions.map((prediction) => (
              <View key={prediction.id} style={styles.predictionCard}>
                <View style={styles.predictionHeader}>
                  <Icon 
                    name={prediction.type === 'capacity' ? 'storage' :
                          prediction.type === 'anomaly' ? 'psychology' :
                          prediction.type === 'performance' ? 'speed' :
                          prediction.type === 'failure' ? 'error' : 'tune'} 
                    size={20} 
                    color="#00FF88" 
                  />
                  <Text style={styles.predictionTitle}>{prediction.title}</Text>
                  <View style={styles.confidenceScore}>
                    <Text style={styles.confidenceText}>
                      {Math.round(prediction.confidence * 100)}%
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.predictionDescription}>{prediction.description}</Text>
                
                <View style={styles.predictionMeta}>
                  <View style={styles.metaItem}>
                    <Icon name="schedule" size={14} color="#666" />
                    <Text style={styles.metaText}>{prediction.timeframe}</Text>
                  </View>
                  <View style={[styles.impactBadge, { backgroundColor: getImpactColor(prediction.impact) + '20' }]}>
                    <Text style={[styles.impactText, { color: getImpactColor(prediction.impact) }]}>
                      {prediction.impact.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.recommendationSection}>
                  <Text style={styles.recommendationLabel}>Recommendation:</Text>
                  <Text style={styles.recommendationText}>{prediction.recommendation}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'integrations' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Third-Party Integrations</Text>

            {integrations.map((integration) => (
              <View key={integration.id} style={styles.integrationCard}>
                <View style={styles.integrationHeader}>
                  <View style={styles.integrationInfo}>
                    <Icon
                      name={integration.type === 'itsm' ? 'assignment' :
                            integration.type === 'monitoring' ? 'visibility' :
                            integration.type === 'communication' ? 'chat' : 'security'}
                      size={20}
                      color="#00FF88"
                    />
                    <View style={styles.integrationDetails}>
                      <Text style={styles.integrationName}>{integration.name}</Text>
                      <Text style={styles.integrationProvider}>{integration.provider}</Text>
                    </View>
                  </View>

                  <View style={styles.integrationStatus}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(integration.status) }
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(integration.status) }
                    ]}>
                      {integration.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.integrationMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Requests</Text>
                    <Text style={styles.metricValue}>{integration.metrics.totalRequests.toLocaleString()}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Success Rate</Text>
                    <Text style={styles.metricValue}>{integration.metrics.successRate}%</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Avg Response</Text>
                    <Text style={styles.metricValue}>{integration.metrics.avgResponseTime}ms</Text>
                  </View>
                </View>

                <View style={styles.featuresContainer}>
                  {integration.features.map((feature, index) => (
                    <View key={index} style={styles.featureTag}>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.integrationActions}>
                  <Text style={styles.lastSyncText}>
                    Last sync: {formatTimestamp(integration.lastSync)}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setSelectedIntegration(integration)}
                    >
                      <Icon name="settings" size={16} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => Alert.alert('Test Integration', `Testing ${integration.name}...`)}
                    >
                      <Icon name="play-arrow" size={16} color="#00FF88" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'compliance' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Compliance & Audit</Text>

            {/* Compliance Overview */}
            <View style={styles.complianceOverview}>
              <View style={styles.complianceCard}>
                <Text style={styles.complianceNumber}>94%</Text>
                <Text style={styles.complianceLabel}>Overall Score</Text>
              </View>
              <View style={styles.complianceCard}>
                <Text style={[styles.complianceNumber, { color: '#00FF88' }]}>12</Text>
                <Text style={styles.complianceLabel}>Compliant</Text>
              </View>
              <View style={styles.complianceCard}>
                <Text style={[styles.complianceNumber, { color: '#FFA500' }]}>3</Text>
                <Text style={styles.complianceLabel}>Partial</Text>
              </View>
              <View style={styles.complianceCard}>
                <Text style={[styles.complianceNumber, { color: '#FF3366' }]}>1</Text>
                <Text style={styles.complianceLabel}>Non-Compliant</Text>
              </View>
            </View>

            {/* Compliance Frameworks */}
            {[
              { framework: 'SOC 2 Type II', score: 96, status: 'compliant' },
              { framework: 'ISO 27001', score: 94, status: 'compliant' },
              { framework: 'GDPR', score: 89, status: 'partial' },
              { framework: 'HIPAA', score: 98, status: 'compliant' },
              { framework: 'PCI DSS', score: 72, status: 'non-compliant' }
            ].map((framework, index) => (
              <View key={index} style={styles.frameworkCard}>
                <View style={styles.frameworkHeader}>
                  <Text style={styles.frameworkName}>{framework.framework}</Text>
                  <View style={[
                    styles.complianceStatusBadge,
                    { backgroundColor: getComplianceColor(framework.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.complianceStatusText,
                      { color: getComplianceColor(framework.status) }
                    ]}>
                      {framework.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreText}>{framework.score}%</Text>
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      {
                        width: `${framework.score}%`,
                        backgroundColor: getComplianceColor(framework.status)
                      }
                    ]} />
                  </View>
                </View>
              </View>
            ))}

            {/* Audit Trail */}
            <View style={styles.auditSection}>
              <Text style={styles.auditTitle}>Recent Audit Events</Text>
              {[
                { action: 'User Login', user: 'admin@company.com', timestamp: new Date(Date.now() - 300000) },
                { action: 'Configuration Change', user: 'ops@company.com', timestamp: new Date(Date.now() - 600000) },
                { action: 'Data Export', user: 'analyst@company.com', timestamp: new Date(Date.now() - 900000) },
                { action: 'Alert Acknowledged', user: 'engineer@company.com', timestamp: new Date(Date.now() - 1200000) }
              ].map((event, index) => (
                <View key={index} style={styles.auditEvent}>
                  <Icon name="history" size={16} color="#666" />
                  <View style={styles.auditDetails}>
                    <Text style={styles.auditAction}>{event.action}</Text>
                    <Text style={styles.auditUser}>{event.user}</Text>
                  </View>
                  <Text style={styles.auditTime}>{formatTimestamp(event.timestamp)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {activeTab === 'security' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Security & Monitoring</Text>

            {/* Security Overview */}
            <View style={styles.securityOverview}>
              <View style={styles.securityCard}>
                <Icon name="security" size={24} color="#00FF88" />
                <Text style={styles.securityTitle}>Security Score</Text>
                <Text style={styles.securityScore}>87/100</Text>
              </View>
              <View style={styles.securityCard}>
                <Icon name="verified-user" size={24} color="#00BFFF" />
                <Text style={styles.securityTitle}>Active Sessions</Text>
                <Text style={styles.securityScore}>24</Text>
              </View>
              <View style={styles.securityCard}>
                <Icon name="warning" size={24} color="#FFA500" />
                <Text style={styles.securityTitle}>Vulnerabilities</Text>
                <Text style={styles.securityScore}>3</Text>
              </View>
            </View>

            {/* Security Events */}
            <Text style={styles.subsectionTitle}>Recent Security Events</Text>
            {[
              {
                type: 'authentication',
                severity: 'medium',
                title: 'Multiple Failed Login Attempts',
                description: '5 failed login attempts from IP 192.168.1.100',
                timestamp: new Date(Date.now() - 1800000)
              },
              {
                type: 'vulnerability',
                severity: 'high',
                title: 'CVE-2024-0001 Detected',
                description: 'Critical vulnerability found in OpenSSL library',
                timestamp: new Date(Date.now() - 3600000)
              },
              {
                type: 'network',
                severity: 'low',
                title: 'Unusual Port Scan Activity',
                description: 'Port scanning detected from external IP',
                timestamp: new Date(Date.now() - 7200000)
              }
            ].map((event, index) => (
              <View key={index} style={styles.securityEventCard}>
                <View style={styles.securityEventHeader}>
                  <Icon
                    name={event.type === 'authentication' ? 'person' :
                          event.type === 'vulnerability' ? 'bug-report' : 'network-check'}
                    size={20}
                    color={getSeverityColor(event.severity)}
                  />
                  <Text style={styles.securityEventTitle}>{event.title}</Text>
                  <View style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(event.severity) + '20' }
                  ]}>
                    <Text style={[
                      styles.severityBadgeText,
                      { color: getSeverityColor(event.severity) }
                    ]}>
                      {event.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.securityEventDescription}>{event.description}</Text>
                <Text style={styles.securityEventTime}>{formatTimestamp(event.timestamp)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'critical': return '#FF3366';
    case 'high': return '#FF6B35';
    case 'medium': return '#FFA500';
    case 'low': return '#00FF88';
    default: return '#666';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected': return '#00FF88';
    case 'disconnected': return '#666';
    case 'error': return '#FF3366';
    case 'configuring': return '#FFA500';
    default: return '#666';
  }
};

const getComplianceColor = (status: string) => {
  switch (status) {
    case 'compliant': return '#00FF88';
    case 'partial': return '#FFA500';
    case 'non-compliant': return '#FF3366';
    default: return '#666';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#FF3366';
    case 'high': return '#FF6B35';
    case 'medium': return '#FFA500';
    case 'low': return '#00FF88';
    default: return '#666';
  }
};

const formatTimestamp = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
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
  settingsButton: {
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
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#00FF88',
  },
  tabText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  controlsSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  controlItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  predictionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF88',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  confidenceScore: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  predictionDescription: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
    marginBottom: 12,
  },
  predictionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  recommendationSection: {
    backgroundColor: '#0A0A0A',
    padding: 12,
    borderRadius: 8,
  },
  recommendationLabel: {
    fontSize: 12,
    color: '#00FF88',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 18,
  },
  // Integrations styles
  integrationCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  integrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  integrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  integrationDetails: {
    marginLeft: 12,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  integrationProvider: {
    fontSize: 12,
    color: '#666',
  },
  integrationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  integrationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00FF88',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 4,
  },
  featureTag: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 10,
    color: '#FFF',
  },
  integrationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastSyncText: {
    fontSize: 11,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  // Compliance styles
  complianceOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  complianceCard: {
    alignItems: 'center',
  },
  complianceNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 4,
  },
  complianceLabel: {
    fontSize: 11,
    color: '#666',
  },
  frameworkCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  frameworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  frameworkName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  complianceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  complianceStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginRight: 12,
    minWidth: 50,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  auditSection: {
    marginTop: 20,
  },
  auditTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  auditEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  auditDetails: {
    flex: 1,
    marginLeft: 12,
  },
  auditAction: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  auditUser: {
    fontSize: 12,
    color: '#666',
  },
  auditTime: {
    fontSize: 11,
    color: '#666',
  },
  // Security styles
  securityOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  securityCard: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  securityTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  securityScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  securityEventCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  securityEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityEventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginLeft: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  securityEventDescription: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
  },
  securityEventTime: {
    fontSize: 11,
    color: '#666',
  },
});

export default AdvancedFeaturesScreen;
