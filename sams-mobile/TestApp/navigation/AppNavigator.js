import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createDrawerNavigator} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import LoginScreen from '../screens/Login/LoginScreen';
import DashboardHome from '../screens/Dashboard/DashboardHome';
import ServerManagement from '../screens/Dashboard/ServerManagement';
import InfraHealth from '../screens/Dashboard/InfraHealth';
import ExecuteCommands from '../screens/Dashboard/ExecuteCommands';
import Reports from '../screens/Dashboard/Reports';
import Alerts from '../screens/Dashboard/Alerts';
import Logout from '../screens/Dashboard/Logout';

// Import components
import SidebarMenu from '../components/SidebarMenu';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const MainDrawer = () => {
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
        drawerStyle: {
          backgroundColor: '#ffffff',
          width: 280,
        },
      }}>
      <Drawer.Screen
        name="DashboardHome"
        component={DashboardHome}
        options={{
          title: 'Dashboard',
          drawerLabel: 'Dashboard',
          drawerIcon: ({color, size}) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ServerManagement"
        component={ServerManagement}
        options={{
          title: 'Server Management',
          drawerLabel: 'Server Management',
          drawerIcon: ({color, size}) => (
            <Icon name="dns" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="InfraHealth"
        component={InfraHealth}
        options={{
          title: 'Infra Health',
          drawerLabel: 'Infra Health Dashboard',
          drawerIcon: ({color, size}) => (
            <Icon name="monitor-heart" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ExecuteCommands"
        component={ExecuteCommands}
        options={{
          title: 'Execute Commands',
          drawerLabel: 'Execute Commands',
          drawerIcon: ({color, size}) => (
            <Icon name="terminal" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Reports"
        component={Reports}
        options={{
          title: 'Reports',
          drawerLabel: 'Reports / Stored Queries',
          drawerIcon: ({color, size}) => (
            <Icon name="assessment" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Alerts"
        component={Alerts}
        options={{
          title: 'Alerts',
          drawerLabel: 'Alerts & Notifications',
          drawerIcon: ({color, size}) => (
            <Icon name="notifications-active" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Logout"
        component={Logout}
        options={{
          title: 'Logout',
          drawerLabel: 'Logout',
          drawerIcon: ({color, size}) => (
            <Icon name="logout" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainApp" component={MainDrawer} />
    </Stack.Navigator>
  );
};

export default AppNavigator; 