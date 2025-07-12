/**
 * 📱 SAMS Mobile App - Enterprise Version
 * Full-featured React Native application with authentication and navigation
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store, persistor } from './src/store/simpleStore';
import SimpleRootNavigator from './src/navigation/SimpleRootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/ui/LoadingScreen';

// Ignore specific warnings for cleaner development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
  'Warning: componentWillReceiveProps has been renamed',
]);

const App: React.FC = () => {
  useEffect(() => {
    // Initialize app services
    console.log('🚀 SAMS Mobile App Starting...');
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StatusBar
                barStyle="light-content"
                backgroundColor="#0A0A0A"
                translucent={false}
              />
              <NavigationContainer>
                <SimpleRootNavigator />
              </NavigationContainer>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};


export default App;
