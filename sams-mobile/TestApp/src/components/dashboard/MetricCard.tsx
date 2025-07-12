import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: number; // -1 for down, 0 for stable, 1 for up
  onPress?: () => void;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  trend = 0,
  onPress,
  subtitle,
}) => {
  const getTrendIcon = () => {
    if (trend > 0) return 'trending-up';
    if (trend < 0) return 'trending-down';
    return 'trending-flat';
  };

  const getTrendColor = () => {
    if (trend > 0) return '#4CAF50';
    if (trend < 0) return '#F44336';
    return '#9E9E9E';
  };

  const CardContent = () => (
    <View style={styles.container}>
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={styles.iconContainer}
      >
        <Icon name={icon} size={24} color="#fff" />
      </LinearGradient>
      
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <Icon
            name={getTrendIcon()}
            size={16}
            color={getTrendColor()}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.wrapper} onPress={onPress}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrapper}>
      <CardContent />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  trendContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default MetricCard;
