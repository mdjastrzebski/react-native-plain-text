import { registerRootComponent } from 'expo';

const App =
  process.env.VRT_ENABLED === '1' ? require('./src/AppVrt').default : require('./src/App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
