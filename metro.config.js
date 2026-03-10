const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const isCI = !!process.env.CI && process.env.CI !== "false";

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  // Disable on CI to avoid Metro hashing errors for generated CSS during exports
  forceWriteFileSystem: !isCI,
});
