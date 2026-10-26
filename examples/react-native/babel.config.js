const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../../package.json');

const root = path.resolve(__dirname, '../..');

module.exports = getConfig(
  {
    presets: ['module:@react-native/babel-preset'],
    // Last, as reanimated 4 requires. Expo's preset adds it, this one does not.
    plugins: ['react-native-worklets/plugin'],
  },
  { root, pkg }
);
