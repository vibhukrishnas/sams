import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  RefreshControl 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, typography } from '../theme/theme';

interface ApplicationLog {
  applicationId: string;
  severity: string;
  message: string;
  timestamp: string;
  formattedTimestamp: string;
}

interface Application {
  id: string;
  name: string;
  statistics: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    error: number;
  };
}

const ApplicationLogViewerScreen: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchApplicationLogs(selectedApp.id, severityFilter);
    }
  }, [selectedApp, severityFilter]);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8080/api/v1/applications');
      const data = await response.json();
      setApplications(data.applications);
      
      // Select first application by default
      if (data.applications.length > 0 && !selectedApp) {
        setSelectedApp(data.applications[0]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplicationLogs = async (appId: string, severity: string = 'all') => {
    try {
      const severityParam = severity !== 'all' ? `?severity=${severity}` : '';
      const response = await fetch(`http://localhost:8080/api/v1/applications/${appId}/logs${severityParam}`);
      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error('Error fetching application logs:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchApplications();
    if (selectedApp) {
      await fetchApplicationLogs(selectedApp.id, severityFilter);
    }
    setIsRefreshing(false);
  };

  const filteredApplications = applications.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'error':
        return colors.danger;
      case 'warning':
        return colors.warning;
      case 'success':
      case 'info':
        return colors.success;
      default:
        return colors.info;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'check-circle';
      case 'info':
        return 'info';
      default:
        return 'help';
    }
  };

  const renderApplicationItem = ({ item }: { item: Application }) => (
    <TouchableOpacity
      style={[
        styles.appItem,
        selectedApp?.id === item.id && styles.selectedAppItem
      ]}
      onPress={() => setSelectedApp(item)}
    >
      <View style={styles.appItemContent}>
        <Text style={styles.appName}>{item.name}</Text>
        <View style={styles.appStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.danger }]}>
              {item.statistics.critical + item.statistics.error}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {item.statistics.warning}
            </Text>
            <Text style={styles.statLabel}>Warning</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {item.statistics.info}
            </Text>
            <Text style={styles.statLabel}>Info</Text>
          </View>
        </View>
      </View>
      <Icon 
        name="chevron-right" 
        size={24} 
        color={selectedApp?.id === item.id ? colors.primary : colors.textMuted} 
      />
    </TouchableOpacity>
  );

  const renderLogItem = ({ item }: { item: ApplicationLog }) => (
    <View style={[styles.logItem, { borderLeftColor: getSeverityColor(item.severity) }]}>
      <View style={styles.logHeader}>
        <Icon 
          name={getSeverityIcon(item.severity)} 
          size={16} 
          color={getSeverityColor(item.severity)} 
        />
        <Text style={[styles.logSeverity, { color: getSeverityColor(item.severity) }]}>
          {item.severity.toUpperCase()}
        </Text>
        <Text style={styles.logTimestamp}>{item.formattedTimestamp}</Text>
      </View>
      <Text style={styles.logMessage}>{item.message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Application Logs</Text>
        <Text style={styles.headerSubtitle}>Monitor application-specific logs and alerts</Text>
      </View>

      <View style={styles.content}>
        {/* Left Panel - Applications */}
        <View style={styles.leftPanel}>
          <Text style={styles.sectionTitle}>View Logs</Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder="--Search by App Name--"
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          <FlatList
            data={filteredApplications}
            renderItem={renderApplicationItem}
            keyExtractor={(item) => item.id}
            style={styles.appList}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            }
          />
        </View>

        {/* Right Panel - Logs */}
        <View style={styles.rightPanel}>
          <Text style={styles.sectionTitle}>Logs and Alerts</Text>
          
          {selectedApp && (
            <>
              <View style={styles.appNameContainer}>
                <Text style={styles.selectedAppName}>{selectedApp.name}</Text>
              </View>

              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    styles.alertButton,
                    severityFilter === 'critical' && styles.activeFilter
                  ]}
                  onPress={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
                >
                  <Text style={styles.filterButtonText}>Alert</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    styles.warnButton,
                    severityFilter === 'warning' && styles.activeFilter
                  ]}
                  onPress={() => setSeverityFilter(severityFilter === 'warning' ? 'all' : 'warning')}
                >
                  <Text style={styles.filterButtonText}>Warn</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={logs}
                renderItem={renderLogItem}
                keyExtractor={(item, index) => `${item.applicationId}-${index}`}
                style={styles.logList}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Icon name="description" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyStateText}>No logs found</Text>
                  </View>
                }
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTitle: {
    ...typography.heading1,
    color: '#ffffff',
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 300,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.md,
  },
  rightPanel: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
    color: colors.text,
    ...typography.body,
  },
  appList: {
    flex: 1,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedAppItem: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  appItemContent: {
    flex: 1,
  },
  appName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600' as const,
    marginBottom: spacing.xs,
  },
  appStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.caption,
    fontWeight: '700' as const,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  appNameContainer: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 6,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  selectedAppName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600' as const,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  alertButton: {
    backgroundColor: colors.danger,
  },
  warnButton: {
    backgroundColor: colors.warning,
  },
  activeFilter: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  filterButtonText: {
    color: '#ffffff',
    fontWeight: '600' as const,
    ...typography.caption,
  },
  logList: {
    flex: 1,
  },
  logItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  logSeverity: {
    ...typography.caption,
    fontWeight: '700' as const,
  },
  logTimestamp: {
    ...typography.small,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  logMessage: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});

export default ApplicationLogViewerScreen;
