const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Tell Metro where to find the app source
config.watchFolders = [path.resolve(__dirname, "src")];

module.exports = withNativeWind(config, { input: "./src/global.css" });
