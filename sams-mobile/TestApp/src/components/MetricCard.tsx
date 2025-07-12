/**
 * 📊 Metric Card Component - Reusable Metric Display
 * Professional metric cards with animations and touch feedback
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 cards per row with margins

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
  trend,
  trendValue,
  onPress,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'stable':
        return 'trending-flat';
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      case 'stable':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Icon name={icon} size={24} color="#FFFFFF" />
            {trend && (
              <View style={styles.trendContainer}>
                <Icon 
                  name={getTrendIcon()!} 
                  size={16} 
                  color={getTrendColor()} 
                />
                {trendValue && (
                  <Text style={[styles.trendText, { color: getTrendColor() }]}>
                    {trendValue}
                  </Text>
                )}
              </View>
            )}
          </View>
          
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.title}>{title}</Text>
          
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gradient: {
    borderRadius: 12,
    padding: 15,
    minHeight: 100,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 2,
  },
});

export default MetricCard;
