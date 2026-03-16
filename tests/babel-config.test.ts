import { describe, expect, it } from "vitest";

const loadBabelConfig = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const configFn = require("../babel.config");
  const api = {
    cache: Object.assign((value: unknown) => value, {
      forever: () => true,
      never: () => false,
      using: (fn: () => unknown) => fn(),
    }),
  };
  return configFn(api);
};

describe("babel.config", () => {
  it("includes Reanimated plugin last to avoid runtime crashes", () => {
    const config = loadBabelConfig();
    const plugins = config.plugins ?? [];

    expect(plugins).toContain("react-native-reanimated/plugin");
    expect(plugins).toContain("react-native-worklets/plugin");
    const workletsIndex = plugins.indexOf("react-native-worklets/plugin");
    const reanimatedIndex = plugins.indexOf("react-native-reanimated/plugin");

    expect(workletsIndex).toBeGreaterThanOrEqual(0);
    expect(reanimatedIndex).toBeGreaterThanOrEqual(0);
    expect(workletsIndex).toBeLessThan(reanimatedIndex);
    // Reanimated requires its Babel plugin to be the final entry
    expect(plugins[plugins.length - 1]).toBe("react-native-reanimated/plugin");
  });

  it("includes each plugin only once to prevent duplicate plugin errors", () => {
    const config = loadBabelConfig();
    const plugins = config.plugins ?? [];

    const seen = new Set<string>();
    for (const plugin of plugins) {
      if (typeof plugin === "string") {
        expect(seen.has(plugin), `Duplicate plugin detected: ${plugin}`).toBe(false);
        seen.add(plugin);
      }
    }
  });

  it("disables babel-preset-expo auto-injection to prevent duplicates", () => {
    const config = loadBabelConfig();
    const presets = config.presets ?? [];
    const expoPreset = presets.find(
      (p: unknown) => Array.isArray(p) && p[0] === "babel-preset-expo"
    );
    expect(expoPreset).toBeDefined();
    const opts = (expoPreset as [string, Record<string, unknown>])[1];
    expect(opts.reanimated).toBe(false);
    expect(opts.worklets).toBe(false);
  });
});
