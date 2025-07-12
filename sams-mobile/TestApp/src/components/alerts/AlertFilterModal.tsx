import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getTheme } from '../../theme';

interface AlertFilter {
  severity: string[];
  status: string[];
  dateRange: string;
  servers: string[];
  categories: string[];
  showResolved: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: AlertFilter) => void;
  currentFilters: AlertFilter;
  isDark: boolean;
}

const AlertFilterModal: React.FC<Props> = ({
  visible,
  onClose,
  onApply,
  currentFilters,
  isDark,
}) => {
  const theme = getTheme(isDark);
  const [filters, setFilters] = useState<AlertFilter>(currentFilters);

  const severityOptions = [
    { label: 'Critical', value: 'critical', color: '#F44336' },
    { label: 'High', value: 'high', color: '#FF9800' },
    { label: 'Medium', value: 'medium', color: '#FFC107' },
    { label: 'Low', value: 'low', color: '#4CAF50' },
    { label: 'Info', value: 'info', color: '#2196F3' },
  ];

  const statusOptions = [
    { label: 'New', value: 'new' },
    { label: 'Acknowledged', value: 'acknowledged' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Snoozed', value: 'snoozed' },
  ];

  const dateRangeOptions = [
    { label: 'Last Hour', value: '1h' },
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'All Time', value: 'all' },
  ];

  const sortOptions = [
    { label: 'Date Created', value: 'created_at' },
    { label: 'Severity', value: 'severity' },
    { label: 'Status', value: 'status' },
    { label: 'Server Name', value: 'server_name' },
  ];

  const toggleSeverity = (severity: string) => {
    const newSeverity = filters.severity.includes(severity)
      ? filters.severity.filter(s => s !== severity)
      : [...filters.severity, severity];
    setFilters({ ...filters, severity: newSeverity });
  };

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    setFilters({ ...filters, status: newStatus });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: AlertFilter = {
      severity: [],
      status: [],
      dateRange: 'all',
      servers: [],
      categories: [],
      showResolved: true,
      sortBy: 'created_at',
      sortOrder: 'desc',
    };
    setFilters(resetFilters);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Filter Alerts
          </Text>
          <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
            <Text style={[styles.resetText, { color: theme.colors.primary }]}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Severity Filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Severity
            </Text>
            <View style={styles.optionsGrid}>
              {severityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.severityOption,
                    {
                      backgroundColor: filters.severity.includes(option.value)
                        ? option.color
                        : theme.colors.surface,
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() => toggleSeverity(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: filters.severity.includes(option.value)
                          ? '#FFFFFF'
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Status
            </Text>
            <View style={styles.optionsGrid}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    {
                      backgroundColor: filters.status.includes(option.value)
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => toggleStatus(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: filters.status.includes(option.value)
                          ? '#FFFFFF'
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Date Range
            </Text>
            <View style={styles.optionsGrid}>
              {dateRangeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dateOption,
                    {
                      backgroundColor: filters.dateRange === option.value
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setFilters({ ...filters, dateRange: option.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: filters.dateRange === option.value
                          ? '#FFFFFF'
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Show Resolved Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Show Resolved Alerts
              </Text>
              <Switch
                value={filters.showResolved}
                onValueChange={(value) => setFilters({ ...filters, showResolved: value })}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Sort By
            </Text>
            <View style={styles.sortContainer}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    {
                      backgroundColor: filters.sortBy === option.value
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setFilters({ ...filters, sortBy: option.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: filters.sortBy === option.value
                          ? '#FFFFFF'
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={[
                styles.sortOrderButton,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              onPress={() => setFilters({
                ...filters,
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
              })}
            >
              <Icon
                name={filters.sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                size={20}
                color={theme.colors.text}
              />
              <Text style={[styles.sortOrderText, { color: theme.colors.text }]}>
                {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  dateOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  sortOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortOrderText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AlertFilterModal;
