const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

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

module.exports = withNativeWind(config, { input: "./global.css" });
