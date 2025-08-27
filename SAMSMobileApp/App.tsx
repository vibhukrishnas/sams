import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import ServerManagementScreen from './src/screens/ServerManagementScreen';
import InfraHealthDashboardScreen from './src/screens/InfraHealthDashboardScreen';
import ExecuteCommandsScreen from './src/screens/ExecuteCommandsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import AlertsNotificationsScreen from './src/screens/AlertsNotificationsScreen';
import AssetInventoryScreen from './src/screens/AssetInventoryScreen';
import SoftwareManagementScreen from './src/screens/SoftwareManagementScreen';
import DuplicateDataScreen from './src/screens/DuplicateDataScreen';
import CustomDrawerContent from './src/components/CustomDrawerContent';

const Drawer = createDrawerNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Drawer.Navigator
          initialRouteName="InfraHealthDashboard"
          drawerContent={(props) => (
            <CustomDrawerContent {...props} onLogout={handleLogout} />
          )}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#4a90e2',
            },
            headerTintColor: 'white',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            drawerActiveTintColor: '#4a90e2',
            drawerInactiveTintColor: '#7f8c8d',
            drawerStyle: {
              backgroundColor: 'white',
              width: 280,
            },
          }}
        >
          <Drawer.Screen
            name="InfraHealthDashboard"
            component={InfraHealthDashboardScreen}
            options={{
              title: 'Dashboard',
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="dashboard" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="ServerManagement"
            component={ServerManagementScreen}
            options={{
              title: 'Server Management',
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="computer" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="AssetInventory"
            component={AssetInventoryScreen}
            options={{
              title: 'Asset Inventory',
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="inventory" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="SoftwareManagement"
            component={SoftwareManagementScreen}
            options={{
              title: 'Software Management',
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="apps" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="DuplicateData"
            component={DuplicateDataScreen}
            options={{
              title: 'Duplicate Data',
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="content-copy" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="ExecuteCommands"
            component={ExecuteCommandsScreen}
            options={{
              title: 'Execute Commands',
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="terminal" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="Reports"
            component={ReportsScreen}
            options={{
              title: 'Reports / Stored Queries',
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="assessment" color={color} size={size} />
              ),
            }}
          />
          <Drawer.Screen
            name="AlertsNotifications"
            component={AlertsNotificationsScreen}
            options={{
              title: 'Alerts & Notifications',
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="notifications" color={color} size={size} />
              ),
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    </>
  );
}
