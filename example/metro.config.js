const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');
const { withAppduct } = require('@appduct/react-native/metro');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
  conditions: ['react-native-plain-text-source'],
});

config.cacheVersion = `vrt-${process.env.VRT_ENABLED ?? '0'}`;

// Last, after any resolver is set: appduct reads APPDUCT_ENABLED to keep or strip its JS,
// so the VRT Release build (APPDUCT_ENABLED=1) bundles the real client and every other
// release build swaps it for the inert /noop entry.
module.exports = withAppduct(config);
