import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Server } from '../../store/api/samsApi';
import { useNavigation } from '@react-navigation/native';

interface ServerStatusCardProps {
  servers: Server[];
  onViewAll: () => void;
  maxItems?: number;
}

const ServerStatusCard: React.FC<ServerStatusCardProps> = ({
  servers,
  onViewAll,
  maxItems = 3,
}) => {
  const navigation = useNavigation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'offline': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return 'check-circle';
      case 'offline': return 'error';
      case 'warning': return 'warning';
      default: return 'help';
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleServerPress = (serverId: string) => {
    navigation.navigate('ServerDetails' as never, { serverId } as never);
  };

  const renderServerItem = ({ item }: { item: Server }) => (
    <TouchableOpacity
      style={styles.serverItem}
      onPress={() => handleServerPress(item.id)}
    >
      <View style={styles.serverLeft}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Icon
            name={getStatusIcon(item.status)}
            size={16}
            color="#fff"
          />
        </View>
        
        <View style={styles.serverContent}>
          <Text style={styles.serverName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.serverIp} numberOfLines={1}>
            {item.ip}:{item.port}
          </Text>
        </View>
      </View>
      
      <View style={styles.serverRight}>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Icon name="memory" size={12} color="#666" />
            <Text style={styles.metricValue}>{item.cpu}%</Text>
          </View>
          
          <View style={styles.metric}>
            <Icon name="storage" size={12} color="#666" />
            <Text style={styles.metricValue}>{item.memory}%</Text>
          </View>
          
          <View style={styles.metric}>
            <Icon name="schedule" size={12} color="#666" />
            <Text style={styles.metricValue}>{formatUptime(item.uptime)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const displayServers = servers.slice(0, maxItems);
  const hasMoreServers = servers.length > maxItems;

  if (servers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Icon name="dns" size={48} color="#9E9E9E" />
          <Text style={styles.emptyTitle}>No Servers</Text>
          <Text style={styles.emptySubtitle}>Add a server to start monitoring</Text>
          <TouchableOpacity
            style={styles.addServerButton}
            onPress={() => navigation.navigate('AddServer' as never)}
          >
            <Icon name="add" size={16} color="#fff" />
            <Text style={styles.addServerText}>Add Server</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayServers}
        renderItem={renderServerItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      
      {hasMoreServers && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>
            View all {servers.length} servers
          </Text>
          <Icon name="arrow-forward" size={16} color="#1976D2" />
        </TouchableOpacity>
      )}
      
      {!hasMoreServers && servers.length > 0 && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View server details</Text>
          <Icon name="arrow-forward" size={16} color="#1976D2" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  serverItem: {
    paddingVertical: 12,
  },
  serverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serverContent: {
    flex: 1,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  serverIp: {
    fontSize: 12,
    color: '#666',
  },
  serverRight: {
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  viewAllText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  addServerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addServerText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default ServerStatusCard;
