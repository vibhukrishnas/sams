import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BottomTabParamList } from './types';
import { useAppSelector } from '../store/hooks';
import DashboardScreen from '../screens/DashboardScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ServersScreen from '../screens/ServersScreen';
import ReportsScreen from '../screens/ReportsScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const BottomTabNavigator: React.FC = () => {
  const theme = useAppSelector(state => state.ui.theme);
  const isDark = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Alerts':
              iconName = 'warning';
              break;
            case 'Servers':
              iconName = 'computer';
              break;
            case 'Reports':
              iconName = 'assessment';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isDark ? '#4FC3F7' : '#2196F3',
        tabBarInactiveTintColor: isDark ? '#757575' : '#9E9E9E',
        tabBarStyle: {
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          borderTopColor: isDark ? '#333333' : '#E0E0E0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: isDark ? '#1E1E1E' : '#2196F3',
          elevation: 4,
          shadowOpacity: 0.3,
        },
        headerTintColor: isDark ? '#FFFFFF' : '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'SAMS Dashboard',
        }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{
          title: 'System Alerts',
        }}
      />
      <Tab.Screen 
        name="Servers" 
        component={ServersScreen}
        options={{
          title: 'Server Management',
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{
          title: 'Reports & Analytics',
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
