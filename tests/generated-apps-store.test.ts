import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage before importing the store to avoid window access in Node test env
const { mockStorage } = vi.hoisted(() => ({
  mockStorage: new Map<string, string>(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) =>
      mockStorage.has(key) ? mockStorage.get(key)! : null,
    setItem: async (key: string, value: string) => {
      mockStorage.set(key, value);
    },
    removeItem: async (key: string) => {
      mockStorage.delete(key);
    },
    clear: async () => {
      mockStorage.clear();
    },
  },
}));

// Import AFTER mocks are set up
import { useGeneratedAppsStore, type GeneratedApp } from "../store/generated-apps-store";

describe("useGeneratedAppsStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useGeneratedAppsStore.setState({ apps: [], loaded: false });
    mockStorage.clear();
  });

  it("initializes with empty apps", () => {
    const state = useGeneratedAppsStore.getState();
    expect(state.apps).toEqual([]);
    expect(state.loaded).toBe(false);
  });

  it("adds a new app", () => {
    const store = useGeneratedAppsStore.getState();
    store.addApp({
      type: "app",
      name: "Todo App",
      description: "A simple todo list",
      code: "const App = () => <div>Todo</div>;",
    });

    // Get fresh state after mutation
    const state = useGeneratedAppsStore.getState();
    expect(state.apps.length).toBeGreaterThan(0);
    const app = state.apps[state.apps.length - 1];
    expect(app.name).toBe("Todo App");
    expect(app.type).toBe("app");
    expect(app.buildStatus).toBe("idle");
  });

  it("deletes an app", () => {
    const store = useGeneratedAppsStore.getState();
    store.addApp({
      type: "website",
      name: "My Website",
      description: "A website",
      code: "<html></html>",
    });

    const stateAfterAdd = useGeneratedAppsStore.getState();
    const appId = stateAfterAdd.apps[stateAfterAdd.apps.length - 1].id;
    store.deleteApp(appId);

    const state = useGeneratedAppsStore.getState();
    expect(state.apps.filter((a) => a.id === appId)).toHaveLength(0);
  });

  it("updates an app", () => {
    const store = useGeneratedAppsStore.getState();
    store.addApp({
      type: "app",
      name: "Original Name",
      description: "Original description",
      code: "code",
    });

    const stateAfterAdd = useGeneratedAppsStore.getState();
    const appId = stateAfterAdd.apps[stateAfterAdd.apps.length - 1].id;
    store.updateApp(appId, {
      name: "Updated Name",
      buildStatus: "building",
    });

    const state = useGeneratedAppsStore.getState();
    const updated = state.apps.find((a) => a.id === appId);
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.buildStatus).toBe("building");
  });

  it("retrieves an app by ID", () => {
    const store = useGeneratedAppsStore.getState();
    store.addApp({
      type: "app",
      name: "Test App",
      description: "Test",
      code: "code",
    });

    const stateAfterAdd = useGeneratedAppsStore.getState();
    const appId = stateAfterAdd.apps[stateAfterAdd.apps.length - 1].id;
    const retrieved = store.getApp(appId);

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("Test App");
  });

  it("returns undefined for non-existent app", () => {
    const store = useGeneratedAppsStore.getState();
    const retrieved = store.getApp("non-existent-id");
    expect(retrieved).toBeUndefined();
  });

  it("generates unique IDs for each app", () => {
    const store = useGeneratedAppsStore.getState();
    store.addApp({
      type: "app",
      name: "App 1",
      description: "First",
      code: "code1",
    });
    store.addApp({
      type: "app",
      name: "App 2",
      description: "Second",
      code: "code2",
    });

    const state = useGeneratedAppsStore.getState();
    expect(state.apps.length).toBeGreaterThanOrEqual(2);
    const lastTwo = state.apps.slice(-2);
    expect(lastTwo[0].id).not.toBe(lastTwo[1].id);
  });

  it("sets timestamps on app creation", () => {
    const store = useGeneratedAppsStore.getState();
    const before = Date.now();
    store.addApp({
      type: "website",
      name: "Test",
      description: "Test",
      code: "code",
    });
    const after = Date.now();

    const state = useGeneratedAppsStore.getState();
    const app = state.apps[state.apps.length - 1];
    expect(app.createdAt).toBeGreaterThanOrEqual(before);
    expect(app.createdAt).toBeLessThanOrEqual(after);
    expect(app.updatedAt).toBe(app.createdAt);
  });

  it("persists changes to AsyncStorage after mutations", async () => {
    const store = useGeneratedAppsStore.getState();
    const added = store.addApp({
      type: "app",
      name: "Persisted App",
      description: "Saved to storage",
      code: "console.log('persist');",
    });

    // allow async save to resolve
    await Promise.resolve();
    const storedAfterAdd = mockStorage.get("notewise_generated_apps");
    expect(storedAfterAdd).toBeTruthy();
    const parsedAfterAdd = JSON.parse(storedAfterAdd!);
    expect(parsedAfterAdd.some((a: GeneratedApp) => a.id === added.id)).toBe(true);

    store.deleteApp(added.id);
    await Promise.resolve();
    const storedAfterDelete = mockStorage.get("notewise_generated_apps");
    expect(storedAfterDelete).toBeTruthy();
    const parsedAfterDelete = JSON.parse(storedAfterDelete!);
    expect(parsedAfterDelete.every((a: GeneratedApp) => a.id !== added.id)).toBe(true);
  });
});
