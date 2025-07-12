/**
 * SAMS React Native Background Processing POC
 * Entry point for the React Native application
 * 
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './package.json';

// Register the main application component
AppRegistry.registerComponent(appName, () => App);

console.log('🚀 SAMS React Native Background Processing POC initialized');
