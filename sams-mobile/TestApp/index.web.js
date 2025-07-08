import { AppRegistry } from 'react-native';
import App from './App';

// Register the app
AppRegistry.registerComponent('TestApp', () => App);

// Run the app
AppRegistry.runApplication('TestApp', {
  rootTag: document.getElementById('root')
});
