import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Alert,
  BackHandler,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {createStackNavigator} from '@react-navigation/stack';
import {Provider as PaperProvider} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from 'react-native-splash-screen';

// Screens
import LoginScreen from './screens/Login/LoginScreen';
import DashboardHome from './screens/Dashboard/DashboardHome';
import ServerManagement from './screens/Dashboard/ServerManagement';
import InfraHealth from './screens/Dashboard/InfraHealth';
import ExecuteCommands from './screens/Dashboard/ExecuteCommands';
import Reports from './screens/Dashboard/Reports';
import Alerts from './screens/Dashboard/Alerts';
import Logout from './screens/Dashboard/Logout';

// Components
import SidebarMenu from './components/SidebarMenu';

// Context
import {AuthProvider, useAuth} from './context/AuthContext';

// Navigation
import AppNavigator from './navigation/AppNavigator';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const AppContent = () => {
  const {isAuthenticated, logout} = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hide splash screen after app loads
    setTimeout(() => {
      SplashScreen.hide();
      setIsLoading(false);
    }, 2000);

    // Handle back button press
    const backAction = () => {
      if (isAuthenticated) {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {text: 'Yes', onPress: () => logout()},
        ]);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [isAuthenticated, logout]);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        {/* Splash screen content */}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={MainAppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const MainAppNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <SidebarMenu {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e3a8a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Drawer.Screen
        name="DashboardHome"
        component={DashboardHome}
        options={{
          title: 'Dashboard',
          drawerLabel: 'Dashboard',
        }}
      />
      <Drawer.Screen
        name="ServerManagement"
        component={ServerManagement}
        options={{
          title: 'Server Management',
          drawerLabel: 'Server Management',
        }}
      />
      <Drawer.Screen
        name="InfraHealth"
        component={InfraHealth}
        options={{
          title: 'Infra Health',
          drawerLabel: 'Infra Health Dashboard',
        }}
      />
      <Drawer.Screen
        name="ExecuteCommands"
        component={ExecuteCommands}
        options={{
          title: 'Execute Commands',
          drawerLabel: 'Execute Commands',
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={Reports}
        options={{
          title: 'Reports',
          drawerLabel: 'Reports / Stored Queries',
        }}
      />
      <Drawer.Screen
        name="Alerts"
        component={Alerts}
        options={{
          title: 'Alerts',
          drawerLabel: 'Alerts & Notifications',
        }}
      />
      <Drawer.Screen
        name="Logout"
        component={Logout}
        options={{
          title: 'Logout',
          drawerLabel: 'Logout',
        }}
      />
    </Drawer.Navigator>
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