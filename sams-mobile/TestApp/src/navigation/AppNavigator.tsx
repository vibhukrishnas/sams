/**
 * 🧭 App Navigator - Complete Navigation Implementation
 * Full React Navigation setup with authentication flow
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Platform } from 'react-native';

// Screens
import EnhancedLoginScreen from '../screens/auth/EnhancedLoginScreen';
import BiometricSetupScreen from '../screens/auth/BiometricSetupScreen';
import PinSetupScreen from '../screens/auth/PinSetupScreen';
import EnhancedDashboardScreen from '../screens/dashboard/EnhancedDashboardScreen';
import AdvancedAlertScreen from '../screens/alerts/AdvancedAlertScreen';
import AlertDetailsScreen from '../screens/AlertDetailsScreen';
import ServersScreen from '../screens/ServersScreen';
import ServerDetailsScreen from '../screens/ServerDetailsScreen';
import AddServerScreen from '../screens/AddServerScreen';
import EditServerScreen from '../screens/EditServerScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ExecuteCommandsScreen from '../screens/ExecuteCommandsScreen';
import InfraHealthDashboardScreen from '../screens/InfraHealthDashboardScreen';
import AlertsScreen from '../screens/AlertsScreen';
import AdvancedFeaturesScreen from '../screens/AdvancedFeaturesScreen';
import PerformanceDashboardScreen from '../screens/PerformanceDashboardScreen';
import ImplementationRoadmapScreen from '../screens/ImplementationRoadmapScreen';
import QualityAssuranceScreen from '../screens/QualityAssuranceScreen';
import EnhancedSettingsScreen from '../screens/settings/EnhancedSettingsScreen';
import AboutScreen from '../screens/AboutScreen';

// Components
import CustomDrawerContent from '../../components/CustomDrawerContent';

// Services
import AuthenticationService from '../services/AuthenticationService';
import PerformanceMonitoringService from '../services/PerformanceMonitoringService';

// Types
import { RootState } from '../store';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const AppNavigator: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize services
        const authService = AuthenticationService.getInstance();
        const performanceService = PerformanceMonitoringService.getInstance();

        await authService.initialize();
        await performanceService.initialize();

        // Check authentication status
        const isLoggedIn = await authService.isAuthenticated();
        if (isLoggedIn) {
          const userData = await authService.getCurrentUser();
          // dispatch(setUser(userData)); // Uncomment when action is available
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [dispatch]);

  // Tab Navigator for main app screens
  const MainTabNavigator = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'InfraHealth':
              iconName = 'monitor-heart';
              break;
            case 'Commands':
              iconName = 'terminal';
              break;
            case 'Alerts':
              iconName = 'notifications';
              break;
            case 'Reports':
              iconName = 'assessment';
              break;
            case 'Advanced':
              iconName = 'psychology';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={EnhancedDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="InfraHealth"
        component={InfraHealthDashboardScreen}
        options={{ title: 'Infrastructure' }}
      />
      <Tab.Screen
        name="Commands"
        component={ExecuteCommandsScreen}
        options={{ title: 'Commands' }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ title: 'Alerts' }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      <Tab.Screen
        name="Advanced"
        component={AdvancedFeaturesScreen}
        options={{ title: 'Advanced' }}
      />
    </Tab.Navigator>
  );

  // Main App Stack Navigator
  const AppStackNavigator = () => (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1976D2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AlertDetails"
        component={AlertDetailsScreen}
        options={{ title: 'Alert Details' }}
      />
      <Stack.Screen
        name="ServerDetails"
        component={ServerDetailsScreen}
        options={{ title: 'Server Details' }}
      />
      <Stack.Screen
        name="AddServer"
        component={AddServerScreen}
        options={{ title: 'Add Server' }}
      />
      <Stack.Screen
        name="EditServer"
        component={EditServerScreen}
        options={{ title: 'Edit Server' }}
      />
      <Stack.Screen
        name="Servers"
        component={ServersScreen}
        options={{ title: 'Server Management' }}
      />
      <Stack.Screen
        name="Performance"
        component={PerformanceDashboardScreen}
        options={{ title: 'Performance & Scalability' }}
      />
      <Stack.Screen
        name="Roadmap"
        component={ImplementationRoadmapScreen}
        options={{ title: 'Implementation Roadmap' }}
      />
      <Stack.Screen
        name="QualityAssurance"
        component={QualityAssuranceScreen}
        options={{ title: 'Quality Assurance & Testing' }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About' }}
      />
    </Stack.Navigator>
  );

  // Authentication Stack Navigator
  const AuthStackNavigator = () => (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={EnhancedLoginScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
    </Stack.Navigator>
  );

  // Main Drawer Navigator (for authenticated users)
  const DrawerNavigator = () => (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#f8f9fa',
          width: 280,
        },
        drawerActiveTintColor: '#1976D2',
        drawerInactiveTintColor: '#666',
      }}
    >
      <Drawer.Screen
        name="Main"
        component={AppStackNavigator}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Icon name="dashboard" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );

  if (isLoading) {
    return null; // Or a loading screen component
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <DrawerNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  status: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default AppNavigator;
