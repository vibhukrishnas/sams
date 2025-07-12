import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { getTheme } from '../../theme';

interface AlertTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface AlertAnalyticsData {
  trends: AlertTrend[];
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  responseTime: {
    average: number;
    median: number;
    fastest: number;
    slowest: number;
  };
  topServers: Array<{
    name: string;
    alertCount: number;
    severity: string;
  }>;
  resolutionRate: number;
  mttr: number; // Mean Time To Resolution
}

interface Props {
  data: AlertAnalyticsData;
  isDark: boolean;
  timeRange: '24h' | '7d' | '30d' | '90d';
  onTimeRangeChange: (range: '24h' | '7d' | '30d' | '90d') => void;
}

const AlertAnalytics: React.FC<Props> = ({
  data,
  isDark,
  timeRange,
  onTimeRangeChange,
}) => {
  const theme = getTheme(isDark);
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;

  const timeRangeOptions = [
    { label: '24H', value: '24h' as const },
    { label: '7D', value: '7d' as const },
    { label: '30D', value: '30d' as const },
    { label: '90D', value: '90d' as const },
  ];

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const severityColors = {
    critical: '#F44336',
    high: '#FF9800',
    medium: '#FFC107',
    low: '#4CAF50',
    info: '#2196F3',
  };

  const getTrendChartData = () => {
    const labels = data.trends.map(trend => {
      const date = new Date(trend.date);
      return timeRange === '24h' 
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          data: data.trends.map(trend => trend.critical + trend.high + trend.medium + trend.low + trend.info),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const getSeverityChartData = () => {
    return [
      {
        name: 'Critical',
        population: data.severityDistribution.critical,
        color: severityColors.critical,
        legendFontColor: theme.colors.text,
        legendFontSize: 12,
      },
      {
        name: 'High',
        population: data.severityDistribution.high,
        color: severityColors.high,
        legendFontColor: theme.colors.text,
        legendFontSize: 12,
      },
      {
        name: 'Medium',
        population: data.severityDistribution.medium,
        color: severityColors.medium,
        legendFontColor: theme.colors.text,
        legendFontSize: 12,
      },
      {
        name: 'Low',
        population: data.severityDistribution.low,
        color: severityColors.low,
        legendFontColor: theme.colors.text,
        legendFontSize: 12,
      },
      {
        name: 'Info',
        population: data.severityDistribution.info,
        color: severityColors.info,
        legendFontColor: theme.colors.text,
        legendFontSize: 12,
      },
    ].filter(item => item.population > 0);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Alert Analytics
        </Text>
        <View style={styles.timeRangeButtons}>
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.timeRangeButton,
                {
                  backgroundColor: timeRange === option.value
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => onTimeRangeChange(option.value)}
            >
              <Text
                style={[
                  styles.timeRangeButtonText,
                  {
                    color: timeRange === option.value
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

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="trending-up" size={24} color={theme.colors.primary} />
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {data.trends.reduce((sum, trend) => sum + trend.critical + trend.high + trend.medium + trend.low + trend.info, 0)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Total Alerts
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="timer" size={24} color={severityColors.high} />
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {formatTime(data.responseTime.average)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Avg Response
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="check-circle" size={24} color={severityColors.low} />
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {formatPercentage(data.resolutionRate)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Resolution Rate
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="build" size={24} color={severityColors.medium} />
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {formatTime(data.mttr)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            MTTR
          </Text>
        </View>
      </View>

      {/* Alert Trends Chart */}
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
          Alert Trends
        </Text>
        <LineChart
          data={getTrendChartData()}
          width={chartWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Severity Distribution */}
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
          Severity Distribution
        </Text>
        <PieChart
          data={getSeverityChartData()}
          width={chartWidth - 32}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>

      {/* Response Time Breakdown */}
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
          Response Time Analysis
        </Text>
        <View style={styles.responseTimeGrid}>
          <View style={styles.responseTimeItem}>
            <Text style={[styles.responseTimeLabel, { color: theme.colors.textSecondary }]}>
              Fastest
            </Text>
            <Text style={[styles.responseTimeValue, { color: severityColors.low }]}>
              {formatTime(data.responseTime.fastest)}
            </Text>
          </View>
          <View style={styles.responseTimeItem}>
            <Text style={[styles.responseTimeLabel, { color: theme.colors.textSecondary }]}>
              Average
            </Text>
            <Text style={[styles.responseTimeValue, { color: theme.colors.text }]}>
              {formatTime(data.responseTime.average)}
            </Text>
          </View>
          <View style={styles.responseTimeItem}>
            <Text style={[styles.responseTimeLabel, { color: theme.colors.textSecondary }]}>
              Median
            </Text>
            <Text style={[styles.responseTimeValue, { color: theme.colors.text }]}>
              {formatTime(data.responseTime.median)}
            </Text>
          </View>
          <View style={styles.responseTimeItem}>
            <Text style={[styles.responseTimeLabel, { color: theme.colors.textSecondary }]}>
              Slowest
            </Text>
            <Text style={[styles.responseTimeValue, { color: severityColors.critical }]}>
              {formatTime(data.responseTime.slowest)}
            </Text>
          </View>
        </View>
      </View>

      {/* Top Alert Sources */}
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
          Top Alert Sources
        </Text>
        {data.topServers.map((server, index) => (
          <View key={server.name} style={styles.serverItem}>
            <View style={styles.serverRank}>
              <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>
                #{index + 1}
              </Text>
            </View>
            <View style={styles.serverInfo}>
              <Text style={[styles.serverName, { color: theme.colors.text }]}>
                {server.name}
              </Text>
              <Text style={[styles.serverAlerts, { color: theme.colors.textSecondary }]}>
                {server.alertCount} alerts
              </Text>
            </View>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severityColors[server.severity as keyof typeof severityColors] },
              ]}
            >
              <Text style={styles.severityBadgeText}>
                {server.severity.toUpperCase()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  timeRangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  chartContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
  },
  responseTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  responseTimeItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  responseTimeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  responseTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  serverRank: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
  },
  serverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serverAlerts: {
    fontSize: 14,
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default AlertAnalytics;
