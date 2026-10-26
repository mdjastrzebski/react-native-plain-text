const path = require('path');
const pkg = require('../../package.json');

module.exports = {
  // Fonts shared with the Expo app, linked into the native projects with
  // `yarn link-assets` (react-native-asset)
  assets: ['../shared/assets/fonts'],
  dependencies: {
    [pkg.name]: {
      root: path.join(__dirname, '../..'),
      platforms: {
        // Codegen script incorrectly fails without this
        // So we explicitly specify the platforms with empty object
        ios: {},
        android: {},
      },
    },
  },
};
