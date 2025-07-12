/**
 * 🔄 Loading Screen Component
 * Simple loading screen for app initialization
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from '../MockLinearGradient';

const LoadingScreen: React.FC = () => {
  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>🖥️ SAMS</Text>
        <Text style={styles.subtitle}>Server Alert Management System</Text>
        <ActivityIndicator size="large" color="#00FF88" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFF',
  },
});

export default LoadingScreen;
