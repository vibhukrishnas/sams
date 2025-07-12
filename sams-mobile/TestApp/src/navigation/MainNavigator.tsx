import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MainDrawerParamList } from './types';
import BottomTabNavigator from './BottomTabNavigator';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import CustomDrawerContent from '../components/CustomDrawerContent';

const Drawer = createDrawerNavigator<MainDrawerParamList>();

const MainNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          width: 280,
        },
        swipeEnabled: true,
        gestureEnabled: true,
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={BottomTabNavigator}
        options={{
          drawerLabel: 'Dashboard',
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          drawerLabel: 'Settings',
        }}
      />
      <Drawer.Screen 
        name="About" 
        component={AboutScreen}
        options={{
          drawerLabel: 'About',
        }}
      />
    </Drawer.Navigator>
  );
};

export default MainNavigator;
