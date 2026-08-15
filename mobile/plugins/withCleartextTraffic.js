const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    if (androidManifest.manifest && androidManifest.manifest.application) {
      androidManifest.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });
};
