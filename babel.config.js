module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push("react-native-worklets/plugin");
  // Must remain the final plugin per Reanimated docs
  plugins.push("react-native-reanimated/plugin");

  return {
    presets: [
      // Disable babel-preset-expo's automatic worklets/reanimated injection to prevent
      // duplicate plugin errors; we manage the plugins explicitly below.
      ["babel-preset-expo", { jsxImportSource: "nativewind", reanimated: false, worklets: false }],
      "nativewind/babel",
    ],
    plugins,
  };
};
