import { AppRegistry } from 'react-native-web';
import App from './App';
import './styles/globals.css';

AppRegistry.registerComponent('RideShare', () => App);

AppRegistry.runApplication('RideShare', {
  rootTag: document.getElementById('root'),
});
