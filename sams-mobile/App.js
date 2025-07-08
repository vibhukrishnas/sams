import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Alert,
  BackHandler,
  Text,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider as PaperProvider} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Context
import {AuthProvider, useAuth} from './context/AuthContext';

// Navigation
import AppNavigator from './navigation/AppNavigator';

// Main App Content with Authentication
const AppContent = () => {
  const {isAuthenticated, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={{color: 'white', fontSize: 24, fontWeight: 'bold'}}>
          🎉 SAMS Loading... 🎉
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
};



const App = () => {
  return (
    <AuthProvider>
      <PaperProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
          <AppContent />
        </SafeAreaView>
      </PaperProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
  },
});

export default App; 