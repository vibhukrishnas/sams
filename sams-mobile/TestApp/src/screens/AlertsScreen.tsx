/**
 * 🚨 Alerts & Notifications Module
 * Comprehensive alerting system with configuration, multi-channel notifications, and incident response
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QuickActions from '../components/QuickActions';
import OfflineStatus from '../components/OfflineStatus';
import MobileFeatures from '../services/MobileFeatures';

const { width } = Dimensions.get('window');

interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  type: 'threshold' | 'anomaly' | 'availability' | 'security' | 'custom';
  server: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  category: 'system' | 'performance' | 'security' | 'network' | 'application';
  source: string;
  correlationId?: string;
  escalationLevel: number;
  notificationsSent: string[];
  tags: string[];
  metrics?: Record<string, number>;
  runbookUrl?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: Array<{
    metric: string;
    operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
    threshold: number;
    duration: number; // minutes
  }>;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  type: 'threshold' | 'anomaly' | 'availability' | 'security' | 'custom';
  targets: string[]; // server IDs or groups
  suppressionRules?: Array<{
    condition: string;
    duration: number;
  }>;
  escalationPolicy: {
    levels: Array<{
      delay: number; // minutes
      channels: string[];
      recipients: string[];
    }>;
  };
  autoRemediation?: {
    enabled: boolean;
    script: string;
    maxAttempts: number;
  };
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'push' | 'email' | 'sms' | 'slack' | 'teams' | 'webhook' | 'voice';
  enabled: boolean;
  configuration: Record<string, any>;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  severityFilter: string[];
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignee?: string;
  team: string;
  createdAt: Date;
  resolvedAt?: Date;
  alerts: string[]; // alert IDs
  timeline: Array<{
    timestamp: Date;
    action: string;
    user: string;
    details: string;
  }>;
  postMortem?: {
    rootCause: string;
    resolution: string;
    preventionMeasures: string[];
    lessonsLearned: string[];
  };
}

const AlertsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'channels' | 'incidents'>('alerts');
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical' | 'high'>('all');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  const mobileFeatures = MobileFeatures.getInstance();

  // Comprehensive Alerts Data
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // API Base URL - should be configured based on environment
  const API_BASE_URL = 'http://192.168.1.10:8080/api';

  // Load data from real API
  useEffect(() => {
    loadAlertsData();
    loadIncidentsData();
    loadAlertRules();
    loadNotificationChannels();
  }, []);

  const loadAlertsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/alerts`);
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`);
      }
      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError('Failed to load alerts. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentsData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents`);
      if (!response.ok) {
        throw new Error(`Failed to fetch incidents: ${response.status}`);
      }
      const data = await response.json();
      setIncidents(data);
    } catch (err) {
      console.error('Error loading incidents:', err);
    }
  };

  const loadAlertRules = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alert-rules`);
      if (!response.ok) {
        throw new Error(`Failed to fetch alert rules: ${response.status}`);
      }
      const data = await response.json();
      setAlertRules(data);
    } catch (err) {
      console.error('Error loading alert rules:', err);
    }
  };

  const loadNotificationChannels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notification-channels`);
      if (!response.ok) {
        throw new Error(`Failed to fetch notification channels: ${response.status}`);
      }
      const data = await response.json();
      setNotificationChannels(data);
    } catch (err) {
      console.error('Error loading notification channels:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#FF3366';
      case 'high': return '#FF6B35';
      case 'medium': return '#FFA500';
      case 'low': return '#00FF88';
      case 'info': return '#00BFFF';
      default: return '#666';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'threshold': return 'trending-up';
      case 'anomaly': return 'psychology';
      case 'availability': return 'health-and-safety';
      case 'security': return 'security';
      case 'custom': return 'build';
      default: return 'notification-important';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return 'computer';
      case 'performance': return 'speed';
      case 'security': return 'security';
      case 'network': return 'network-check';
      case 'application': return 'apps';
      default: return 'error';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#FF3366';
      case 'investigating': return '#FFA500';
      case 'resolved': return '#00FF88';
      case 'closed': return '#666';
      default: return '#666';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedBy: 'current-user',
            acknowledgedAt: new Date()
          }
        : alert
    ));
    Alert.alert('Success', 'Alert acknowledged successfully.');
  };

  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            resolved: true,
            resolvedBy: 'current-user',
            resolvedAt: new Date()
          }
        : alert
    ));
    Alert.alert('Success', 'Alert resolved successfully.');
  };

  const handleBulkAcknowledge = () => {
    if (selectedAlerts.length === 0) {
      Alert.alert('No Selection', 'Please select alerts to acknowledge.');
      return;
    }

    setAlerts(prev => prev.map(alert =>
      selectedAlerts.includes(alert.id)
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedBy: 'current-user',
            acknowledgedAt: new Date()
          }
        : alert
    ));

    setSelectedAlerts([]);
    setBulkMode(false);
    Alert.alert('Success', `${selectedAlerts.length} alerts acknowledged.`);
  };

  const handleCreateIncident = (alert: SystemAlert) => {
    const newIncident: Incident = {
      id: Date.now().toString(),
      title: `Incident: ${alert.title}`,
      description: alert.message,
      severity: alert.severity,
      status: 'open',
      team: 'Operations',
      createdAt: new Date(),
      alerts: [alert.id],
      timeline: [
        {
          timestamp: new Date(),
          action: 'Incident Created',
          user: 'current-user',
          details: `Created from alert: ${alert.title}`
        }
      ]
    };

    setIncidents(prev => [newIncident, ...prev]);
    Alert.alert('Incident Created', `Incident ${newIncident.id} has been created.`);
  };

  const handleToggleRule = (ruleId: string) => {
    setAlertRules(prev => prev.map(rule =>
      rule.id === ruleId
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
  };

  const handleToggleChannel = (channelId: string) => {
    setNotificationChannels(prev => prev.map(channel =>
      channel.id === channelId
        ? { ...channel, enabled: !channel.enabled }
        : channel
    ));
  };

  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts(prev =>
      prev.includes(alertId)
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  const handleQuickAction = (action: string, data?: any) => {
    const { item, source } = data || {};

    switch (action) {
      case 'acknowledge':
        handleAcknowledge(item.id);
        break;
      case 'escalate':
        handleCreateIncident(item);
        break;
      case 'resolve':
        handleResolve(item.id);
        break;
      case 'details':
        setSelectedAlert(item);
        break;
      case 'emergency_contact':
        Alert.alert('Emergency Contact', 'Contacting on-call engineer...');
        break;
      default:
        console.warn('Unknown quick action:', action);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      // Load fresh data from API
      await Promise.all([
        loadAlertsData(),
        loadIncidentsData(),
        loadAlertRules(),
        loadNotificationChannels()
      ]);

      // Cache current alerts for offline access
      await mobileFeatures.cacheData('alerts', alerts);

    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Real API actions for alerts
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acknowledgedBy: 'mobile-user',
          acknowledgedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to acknowledge alert: ${response.status}`);
      }

      await loadAlertsData();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError('Failed to acknowledge alert');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolvedBy: 'mobile-user',
          resolvedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve alert: ${response.status}`);
      }

      await loadAlertsData();
    } catch (err) {
      console.error('Error resolving alert:', err);
      setError('Failed to resolve alert');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'unacknowledged':
        return !alert.acknowledged;
      case 'critical':
        return alert.severity === 'critical';
      case 'high':
        return alert.severity === 'high';
      default:
        return true;
    }
  });

  const getAlertStats = () => {
    const total = alerts.length;
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const high = alerts.filter(a => a.severity === 'high').length;
    const unacknowledged = alerts.filter(a => !a.acknowledged).length;
    const resolved = alerts.filter(a => a.resolved).length;

    return { total, critical, high, unacknowledged, resolved };
  };

  const stats = getAlertStats();

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <OfflineStatus onSyncPress={onRefresh} />

        <View style={{flex: 1}}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'alerts', label: 'Alerts', icon: 'notification-important' },
            { key: 'rules', label: 'Rules', icon: 'rule' },
            { key: 'channels', label: 'Channels', icon: 'notifications' },
            { key: 'incidents', label: 'Incidents', icon: 'report-problem' }
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

        {/* Content Area */}
        <View style={{flex: 1}}>
          {activeTab === 'alerts' && (
            <ScrollView style={styles.scrollView}>
            {/* Alert Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{stats.total}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: '#FF3366' }]}>{stats.critical}</Text>
                <Text style={styles.summaryLabel}>Critical</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: '#FF6B35' }]}>{stats.high}</Text>
                <Text style={styles.summaryLabel}>High</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNumber, { color: '#FFA500' }]}>{stats.unacknowledged}</Text>
                <Text style={styles.summaryLabel}>Unacknowledged</Text>
              </View>
            </View>

            {/* Filter Tabs and Bulk Actions */}
            <View style={styles.filterHeader}>
              <View style={styles.filterContainer}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'unacknowledged', label: 'Unacknowledged' },
                  { key: 'critical', label: 'Critical' },
                  { key: 'high', label: 'High' }
                ].map((filterOption) => (
                  <TouchableOpacity
                    key={filterOption.key}
                    style={[
                      styles.filterTab,
                      filter === filterOption.key && styles.filterTabActive
                    ]}
                    onPress={() => setFilter(filterOption.key as any)}
                  >
                    <Text style={[
                      styles.filterTabText,
                      filter === filterOption.key && styles.filterTabTextActive
                    ]}>
                      {filterOption.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.bulkButton, bulkMode && styles.bulkButtonActive]}
                onPress={() => setBulkMode(!bulkMode)}
              >
                <Icon name="checklist" size={20} color={bulkMode ? "#000" : "#00FF88"} />
              </TouchableOpacity>
            </View>

            {/* Bulk Actions Bar */}
            {bulkMode && (
              <View style={styles.bulkActionsBar}>
                <Text style={styles.bulkSelectionText}>
                  {selectedAlerts.length} selected
                </Text>
                <View style={styles.bulkActions}>
                  <TouchableOpacity
                    style={styles.bulkActionButton}
                    onPress={handleBulkAcknowledge}
                  >
                    <Icon name="check" size={16} color="#00FF88" />
                    <Text style={styles.bulkActionText}>Acknowledge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bulkActionButton}
                    onPress={() => {
                      setSelectedAlerts([]);
                      setBulkMode(false);
                    }}
                  >
                    <Icon name="clear" size={16} color="#FF3366" />
                    <Text style={styles.bulkActionText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

        {/* Alerts List */}
        <ScrollView
          style={styles.alertsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00FF88"
              colors={['#00FF88']}
            />
          }
        >
          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  onRefresh();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading State */}
          {loading && alerts.length === 0 && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading alerts...</Text>
            </View>
          )}

          {/* No Data State */}
          {!loading && alerts.length === 0 && !error && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No alerts found</Text>
              <Text style={styles.emptySubtext}>
                Pull down to refresh or check your connection
              </Text>
            </View>
          )}

          {/* Alerts List */}
          {filteredAlerts.map((alert) => (
            <QuickActions
              key={alert.id}
              item={alert}
              type="alert"
              onAction={handleQuickAction}
            >
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <View style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(alert.severity) }
                  ]}>
                    <Text style={styles.severityText}>
                      {alert.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertServer}>Server: {alert.server}</Text>
                <Text style={styles.alertTime}>
                  {alert.timestamp.toLocaleString()}
                </Text>

                <View style={styles.alertActions}>
                  {alert.acknowledged ? (
                    <View style={styles.acknowledgedBadge}>
                      <Icon name="check" size={16} color="#00FF88" />
                      <Text style={styles.acknowledgedText}>Acknowledged</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.acknowledgeButton}
                      onPress={() => handleAcknowledge(alert.id)}
                    >
                      <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </QuickActions>
          ))}
        </ScrollView>
        )}

        {activeTab === 'rules' && (
          <ScrollView style={styles.scrollView}>
            <View style={styles.rulesHeader}>
              <Text style={styles.sectionTitle}>Alert Rules</Text>
              <TouchableOpacity style={styles.addButton}>
                <Icon name="add" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {alertRules.map((rule) => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleName}>{rule.name}</Text>
                  <Switch
                    value={rule.enabled}
                    onValueChange={() => handleToggleRule(rule.id)}
                    trackColor={{ false: '#333', true: '#00FF88' }}
                    thumbColor={rule.enabled ? '#FFF' : '#666'}
                  />
                </View>
                <Text style={styles.ruleDescription}>{rule.description}</Text>

                <View style={styles.ruleDetails}>
                  <View style={styles.ruleDetailItem}>
                    <Text style={styles.ruleDetailLabel}>Type:</Text>
                    <Text style={styles.ruleDetailValue}>{rule.type}</Text>
                  </View>
                  <View style={styles.ruleDetailItem}>
                    <Text style={styles.ruleDetailLabel}>Severity:</Text>
                    <Text style={[styles.ruleDetailValue, { color: getSeverityColor(rule.severity) }]}>
                      {rule.severity.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.ruleDetailItem}>
                    <Text style={styles.ruleDetailLabel}>Targets:</Text>
                    <Text style={styles.ruleDetailValue}>{rule.targets.join(', ')}</Text>
                  </View>
                </View>

                {rule.conditions.map((condition, index) => (
                  <View key={index} style={styles.conditionItem}>
                    <Text style={styles.conditionText}>
                      {condition.metric} {condition.operator} {condition.threshold} for {condition.duration}min
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}

        {activeTab === 'channels' && (
          <ScrollView style={styles.scrollView}>
            <View style={styles.channelsHeader}>
              <Text style={styles.sectionTitle}>Notification Channels</Text>
              <TouchableOpacity style={styles.addButton}>
                <Icon name="add" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {notificationChannels.map((channel) => (
              <View key={channel.id} style={styles.channelCard}>
                <View style={styles.channelHeader}>
                  <View style={styles.channelInfo}>
                    <Icon name="notifications" size={20} color="#00FF88" />
                    <Text style={styles.channelName}>{channel.name}</Text>
                  </View>
                  <Switch
                    value={channel.enabled}
                    onValueChange={() => handleToggleChannel(channel.id)}
                    trackColor={{ false: '#333', true: '#00FF88' }}
                    thumbColor={channel.enabled ? '#FFF' : '#666'}
                  />
                </View>

                <View style={styles.channelDetails}>
                  <Text style={styles.channelType}>{channel.type.toUpperCase()}</Text>
                  {channel.quietHours?.enabled && (
                    <Text style={styles.quietHours}>
                      Quiet: {channel.quietHours.start} - {channel.quietHours.end}
                    </Text>
                  )}
                </View>

                <View style={styles.severityFilters}>
                  {channel.severityFilter.map((severity) => (
                    <View key={severity} style={[styles.severityChip, { backgroundColor: getSeverityColor(severity) + '20' }]}>
                      <Text style={[styles.severityChipText, { color: getSeverityColor(severity) }]}>
                        {severity.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            </ScrollView>
          )}

          {activeTab === 'incidents' && (
            <ScrollView style={styles.scrollView}>
            <View style={styles.incidentsHeader}>
              <Text style={styles.sectionTitle}>Active Incidents</Text>
              <TouchableOpacity style={styles.addButton}>
                <Icon name="add" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {incidents.map((incident) => (
              <View key={incident.id} style={styles.incidentCard}>
                <View style={styles.incidentHeader}>
                  <Text style={styles.incidentTitle}>{incident.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(incident.status) }]}>
                      {incident.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.incidentDescription}>{incident.description}</Text>

                <View style={styles.incidentMeta}>
                  <View style={styles.incidentMetaItem}>
                    <Icon name="person" size={14} color="#666" />
                    <Text style={styles.incidentMetaText}>{incident.assignee || 'Unassigned'}</Text>
                  </View>
                  <View style={styles.incidentMetaItem}>
                    <Icon name="group" size={14} color="#666" />
                    <Text style={styles.incidentMetaText}>{incident.team}</Text>
                  </View>
                  <View style={styles.incidentMetaItem}>
                    <Icon name="access-time" size={14} color="#666" />
                    <Text style={styles.incidentMetaText}>
                      {formatTimestamp(incident.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.incidentFooter}>
                  <Text style={styles.alertCount}>
                    {incident.alerts.length} alert{incident.alerts.length !== 1 ? 's' : ''}
                  </Text>
                  <TouchableOpacity style={styles.viewIncidentButton}>
                    <Text style={styles.viewIncidentText}>View Details</Text>
                    <Icon name="arrow-forward" size={16} color="#00FF88" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            </ScrollView>
          )}
        </View>
        </View>

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
  scrollView: {
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  summaryCard: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#00FF88',
  },
  filterTabText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#000',
  },
  bulkButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  bulkButtonActive: {
    backgroundColor: '#00FF88',
  },
  bulkActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  bulkActionText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
  },
  alertsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  alertCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  alertMessage: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
  },
  alertServer: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  acknowledgedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  acknowledgedText: {
    color: '#00FF88',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  acknowledgeButton: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  acknowledgeButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  // Rules styles
  rulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#00FF88',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  ruleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  ruleDetails: {
    marginBottom: 12,
  },
  ruleDetailItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ruleDetailLabel: {
    fontSize: 12,
    color: '#666',
    width: 80,
  },
  ruleDetailValue: {
    fontSize: 12,
    color: '#FFF',
    flex: 1,
  },
  conditionItem: {
    backgroundColor: '#0A0A0A',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  conditionText: {
    fontSize: 12,
    color: '#00FF88',
    fontFamily: 'monospace',
  },
  // Channels styles
  channelsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  channelCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  channelDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelType: {
    fontSize: 12,
    color: '#00FF88',
    fontWeight: 'bold',
    marginRight: 12,
  },
  quietHours: {
    fontSize: 12,
    color: '#666',
  },
  severityFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  severityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityChipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Incidents styles
  incidentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  incidentCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3366',
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  incidentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  incidentMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  incidentMetaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertCount: {
    fontSize: 12,
    color: '#666',
  },
  viewIncidentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewIncidentText: {
    fontSize: 12,
    color: '#00FF88',
    fontWeight: '600',
    marginRight: 4,
  },
  // Error and Loading States
  errorContainer: {
    backgroundColor: '#FF3366',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FF3366',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AlertsScreen;
