import React from 'react';
import { NavigationContainer, DefaultTheme, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { RootStackParamList } from './types';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import AlertDetailsScreen from '../screens/AlertDetailsScreen';
import ServerDetailsScreen from '../screens/ServerDetailsScreen';
import AddServerScreen from '../screens/AddServerScreen';
import EditServerScreen from '../screens/EditServerScreen';

const Stack = createStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sams://', 'https://sams-app.com'],
  config: {
    screens: {
      Auth: 'auth',
      Main: {
        path: 'main',
        screens: {}, // Add nested screens if needed
      },
      AlertDetails: 'alert/:alertId',
      ServerDetails: 'server/:serverId',
      AddServer: 'server/add',
      EditServer: 'server/edit/:serverId',
    },
  },
};

const RootNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  // Optional: Custom theme for navigation (can expand if needed)
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#fff',
    },
  };

  // Android back button handling (optional, robust)
  React.useEffect(() => {
    const backHandler = () => {
      // Add custom back handling if needed
      return false; // Let navigation handle it
    };
    // Only add for Android
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', backHandler);
      return () => sub.remove();
    }
  }, []);

  return (
    <NavigationContainer linking={linking} theme={navTheme}>

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen 
              name="AlertDetails" 
              component={AlertDetailsScreen}
              options={{
                headerShown: true,
                title: 'Alert Details',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="ServerDetails" 
              component={ServerDetailsScreen}
              options={{
                headerShown: true,
                title: 'Server Details',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="AddServer" 
              component={AddServerScreen}
              options={{
                headerShown: true,
                title: 'Add Server',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="EditServer" 
              component={EditServerScreen}
              options={{
                headerShown: true,
                title: 'Edit Server',
                headerBackTitleVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
