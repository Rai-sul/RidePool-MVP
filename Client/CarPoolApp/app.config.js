const { withAndroidManifest } = require('@expo/config-plugins');

const withGoogleMapsApiKey = (config) => {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // Check if meta-data array exists
    if (!mainApplication['meta-data']) {
      mainApplication['meta-data'] = [];
    }
    
    // Check if Google Maps API key already exists
    const existingApiKey = mainApplication['meta-data'].find(
      (item) => item.$['android:name'] === 'com.google.android.geo.API_KEY'
    );
    
    if (!existingApiKey) {
      mainApplication['meta-data'].push({
        $: {
          'android:name': 'com.google.android.geo.API_KEY',
          'android:value': process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBIuA5jCeQ_S6DnAPdvFiJGtYEpliOT6Xc',
        },
      });
    }
    
    return config;
  });
};

module.exports = ({ config }) => {
  return withGoogleMapsApiKey(config);
};
