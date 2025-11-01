const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for @/ path alias
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    '@': path.resolve(__dirname),
  },
};

module.exports = withNativeWind(config, { input: './styles/globals.css' });