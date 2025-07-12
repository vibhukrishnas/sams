/**
 * 🧭 Drawer Navigator
 * Main dashboard with sidebar navigation for SAMS features
 */

import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

// Import screens (we'll create these)
import ServerManagementScreen from '../screens/ServerManagementScreen';
import InfraHealthDashboardScreen from '../screens/InfraHealthDashboardScreen';
import ExecuteCommandsScreen from '../screens/ExecuteCommandsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import AlertsScreen from '../screens/AlertsScreen';

const Drawer = createDrawerNavigator();

// Custom Drawer Content
const CustomDrawerContent = ({ navigation }: any) => {
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => navigation.replace('Auth')
        }
      ]
    );
  };

  const menuItems = [
    {
      name: 'Server Management',
      icon: 'dns',
      screen: 'ServerManagement',
      description: 'Manage servers and infrastructure'
    },
    {
      name: 'Infra Health Dashboard',
      icon: 'dashboard',
      screen: 'InfraHealthDashboard',
      description: 'Monitor system health and metrics'
    },
    {
      name: 'Execute Commands',
      icon: 'terminal',
      screen: 'ExecuteCommands',
      description: 'Run commands on remote servers'
    },
    {
      name: 'Reports / Stored Queries',
      icon: 'assessment',
      screen: 'Reports',
      description: 'Generate reports and manage queries'
    },
    {
      name: 'Alerts & Notifications',
      icon: 'notifications',
      screen: 'Alerts',
      description: 'View and manage system alerts'
    }
  ];

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A']}
      style={styles.drawerContainer}
    >
      {/* Header */}
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>🖥️ SAMS</Text>
        <Text style={styles.drawerSubtitle}>Server Alert Management</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.menuItemContent}>
              <Icon name={item.icon} size={24} color="#00FF88" />
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>{item.name}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Icon name="power-settings-new" size={24} color="#FF3366" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const DrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0A0A0A',
        },
        headerTintColor: '#00FF88',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        drawerStyle: {
          backgroundColor: 'transparent',
          width: 320,
        },
        sceneContainerStyle: {
          backgroundColor: '#0A0A0A',
        },
      }}
    >
      <Drawer.Screen 
        name="ServerManagement" 
        component={ServerManagementScreen}
        options={{
          title: 'Server Management',
          headerLeft: ({ onPress }) => (
            <TouchableOpacity onPress={onPress} style={styles.headerButton}>
              <Icon name="menu" size={24} color="#00FF88" />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen 
        name="InfraHealthDashboard" 
        component={InfraHealthDashboardScreen}
        options={{
          title: 'Infrastructure Health',
          headerLeft: ({ onPress }) => (
            <TouchableOpacity onPress={onPress} style={styles.headerButton}>
              <Icon name="menu" size={24} color="#00FF88" />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen 
        name="ExecuteCommands" 
        component={ExecuteCommandsScreen}
        options={{
          title: 'Execute Commands',
          headerLeft: ({ onPress }) => (
            <TouchableOpacity onPress={onPress} style={styles.headerButton}>
              <Icon name="menu" size={24} color="#00FF88" />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{
          title: 'Reports & Queries',
          headerLeft: ({ onPress }) => (
            <TouchableOpacity onPress={onPress} style={styles.headerButton}>
              <Icon name="menu" size={24} color="#00FF88" />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{
          title: 'Alerts & Notifications',
          headerLeft: ({ onPress }) => (
            <TouchableOpacity onPress={onPress} style={styles.headerButton}>
              <Icon name="menu" size={24} color="#00FF88" />
            </TouchableOpacity>
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 50,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 20,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00FF88',
    marginBottom: 4,
  },
  drawerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  menuItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1A1A1A',
  },
  menuItemText: {
    marginLeft: 16,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#666',
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2A1A1A',
    borderRadius: 12,
  },
  logoutText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3366',
  },
  headerButton: {
    marginLeft: 16,
    padding: 8,
  },
});

export default DrawerNavigator;
