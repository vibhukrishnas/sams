import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const mockApps = [
  'Cisco AnyConnect',
  'Reporting Services',
  'WinBeat Monitor',
  'Fortinet VPN'
];

const mockLogs = {
  'Cisco AnyConnect': [
    { type: 'error', text: 'Out Of Memory Error - Check CrashDump', time: '2025-07-21 22:00:22' },
    { type: 'info', text: 'Server Startup Complete', time: '2025-07-21 22:00:22' }
  ],
  'Reporting Services': [
    { type: 'warn', text: 'Slow in n/w transactions', time: '2025-07-21 22:16:22' },
    { type: 'warn', text: 'Slow in n/w transactions', time: '2025-07-21 22:32:22' }
  ]
};

export default function ViewLogsScreen() {
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);

  const filteredApps = mockApps.filter(a =>
    a.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedApp) {
    const logs = mockLogs[selectedApp] || [];
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => setSelectedApp(null)}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Logs and Alerts for {selectedApp}</Text>
        <ScrollView style={styles.logContainer}>
          {logs.map((log, idx) => (
            <View key={idx} style={[styles.logItem, log.type === 'error' ? styles.error : styles.warn]}>
              <Text style={styles.logText}>{log.text} ({log.time})</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.errorBtn]}><Text style={styles.btnText}>Alert</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.warnBtn]}><Text style={styles.btnText}>Warn</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="--Search by App Name--"
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.list}>
        {filteredApps.map((app, idx) => (
          <TouchableOpacity key={idx} style={styles.item} onPress={() => setSelectedApp(app)}>
            <Text style={styles.itemText}>{app}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#000' },
  backText: { color: '#4CAF50', marginBottom: 12 },
  title: { color: '#fff', fontSize: 18, marginBottom: 12 },
  search: { backgroundColor: '#222', color: '#fff', borderRadius: 8, padding: 8, marginBottom: 16 },
  list: { flexGrow: 0 },
  item: { backgroundColor: '#111', padding: 16, marginRight: 12, borderRadius: 8 },
  itemText: { color: '#fff' },
  logContainer: { flex: 1, marginVertical: 12 },
  logItem: { padding: 12, borderRadius: 6, marginBottom: 8 },
  logText: { color: '#fff' },
  error: { backgroundColor: '#F44336' },
  warn: { backgroundColor: '#FFEB3B' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 12, borderRadius: 6, alignItems: 'center', marginHorizontal: 4 },
  errorBtn: { backgroundColor: '#F44336' },
  warnBtn: { backgroundColor: '#FFEB3B' },
  btnText: { color: '#fff' }
});
