const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Configure custom ports
config.server = {
  ...config.server,
  port: 8083,
};

config.reporter = {
  ...config.reporter,
  update: () => {},
};

// Ensure NativeWind processes the global CSS file
module.exports = withNativeWind(config, {
  input: './global.css',
  // Enable CSS processing for web platform
  inlineRequires: true,
});
