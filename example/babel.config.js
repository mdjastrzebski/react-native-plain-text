const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = function (api) {
  api.cache.using(() => process.env.VRT_ENABLED ?? '0');

  const config = getConfig(
    {
      presets: ['babel-preset-expo'],
    },
    { root, pkg }
  );

  /*
   * `getConfig` scopes its override to the library source with a path *string*.
   * Babel rejects string/RegExp patterns when it is handed no filename, and
   * that is exactly how `@expo/metro-config` (SDK 57+) loads the config to
   * compute its transform cache key — the transformer then fails to construct
   * and every bundle dies with "Cannot read properties of undefined (reading
   * 'transformFile')". A function pattern matches the same files and is exempt
   * from that check.
   */
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['transform-inline-environment-variables', { include: ['VRT_ENABLED'] }],
    ],
    overrides: config.overrides?.map((override) => {
      if (typeof override.include !== 'string') return override;

      const dir = override.include + path.sep;
      return { ...override, include: (filename) => filename?.startsWith(dir) ?? false };
    }),
  };
};
