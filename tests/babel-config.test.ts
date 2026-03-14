import { describe, expect, it } from "vitest";

const loadBabelConfig = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const configFn = require("../babel.config");
  const api = {
    cache: (fn: unknown) => (typeof fn === "function" ? fn(true) : fn),
  };
  return configFn(api);
};

describe("babel.config", () => {
  it("includes Reanimated plugin last to avoid runtime crashes", () => {
    const config = loadBabelConfig();
    const plugins = config.plugins ?? [];

    expect(plugins).toContain("react-native-reanimated/plugin");
    expect(plugins).toContain("react-native-worklets/plugin");
    expect(plugins.indexOf("react-native-worklets/plugin")).toBeLessThan(
      plugins.indexOf("react-native-reanimated/plugin"),
    );
    // Reanimated requires its Babel plugin to be the final entry
    expect(plugins[plugins.length - 1]).toBe("react-native-reanimated/plugin");
  });
});
