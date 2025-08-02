import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import MonitoringService from '../services/monitoring';
import { useNavigation } from '@react-navigation/native';

const mockServers = [
  { id: 1, name: 'Server-1', ip: '192.168.0.101' },
  { id: 2, name: 'Server-2', ip: '192.168.0.102' },
  { id: 3, name: 'Server-3', ip: '192.168.0.103' },
  { id: 4, name: 'Server-4', ip: '192.168.0.104' },
];

export default function ServerManagementScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (selected) {
      MonitoringService.getAllMetrics().then(res => {
        if (res.success) setMetrics(res.data);
      });
    }
  }, [selected]);

  const filtered = mockServers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.ip.includes(search)
  );

  if (selected) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => { setSelected(null); setMetrics(null); }} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage {selected.name} ({selected.ip})</Text>
        <View style={styles.toggleContainer}>
          <Text style={styles.label}>State:</Text>
          <TouchableOpacity style={styles.toggleOn}><Text style={styles.toggleText}>ON</Text></TouchableOpacity>
          <TouchableOpacity style={styles.toggleOff}><Text style={styles.toggleText}>OFF</Text></TouchableOpacity>
        </View>
        {metrics && (
          <View style={styles.statsContainer}>
            <Text style={styles.stat}>Users: {metrics.processes.length}</Text>
            <Text style={styles.stat}>CPU: {metrics.cpu.usage_percent.toFixed(1)}%</Text>
            <Text style={styles.stat}>RAM: {metrics.memory.usage_percent.toFixed(1)}%</Text>
          </View>
        )}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate('ViewLogs', { server: selected })}
          >
            <Text style={styles.btnText}>View Log</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => Alert.alert('Execute Command', 'Feature coming soon')}
          >
            <Text style={styles.btnText}>Exec Cmd</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="--Search by Host / IP addr--"
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.list}>
        {filtered.map(s => (
          <TouchableOpacity key={s.id} style={styles.item} onPress={() => setSelected(s)}>
            <Text style={styles.itemText}>{s.name} ({s.ip})</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  search: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 8, marginBottom: 16 },
  list: { flexGrow: 0 },
  item: { backgroundColor: '#111', padding: 16, marginRight: 12, borderRadius: 8 },
  itemText: { color: '#fff' },
  backBtn: { marginBottom: 12 },
  backText: { color: '#4CAF50' },
  title: { color: '#fff', fontSize: 18, marginBottom: 12 },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  label: { color: '#fff', marginRight: 8 },
  toggleOn: { backgroundColor: '#4CAF50', padding: 8, marginRight: 4, borderRadius: 4 },
  toggleOff: { backgroundColor: '#F44336', padding: 8, borderRadius: 4 },
  toggleText: { color: '#fff' },
  statsContainer: { marginBottom: 16 },
  stat: { color: '#4CAF50', fontSize: 16, marginBottom: 4 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { backgroundColor: '#2196F3', padding: 12, borderRadius: 6, flex: 1, alignItems: 'center', marginHorizontal: 4 },
  btnText: { color: '#fff' }
});
