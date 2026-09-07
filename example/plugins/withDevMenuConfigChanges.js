/*
 * Keeps Expo Dev Menu UI out of development-client E2E runs. These values
 * become AndroidManifest.xml metadata during prebuild, so clearing app state
 * does not restore the onboarding sheet or floating tools button.
 */

const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const DEV_MENU_DEFAULTS = {
  EXDevMenuIsOnboardingFinished: 'true',
  EXDevMenuShowsAtLaunch: 'false',
  EXDevMenuShowFloatingActionButton: 'false',
};

const withDevMenuConfigChanges = (config) =>
  withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);

    for (const [name, value] of Object.entries(DEV_MENU_DEFAULTS)) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, name, value);
    }

    return cfg;
  });

module.exports = withDevMenuConfigChanges;
