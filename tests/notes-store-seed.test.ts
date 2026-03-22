import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: new Map<string, string>(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => (mockStorage.has(key) ? mockStorage.get(key)! : null),
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

import { useNotesStore } from "../store/notes-store";

describe("useNotesStore seed notes", () => {
  beforeEach(() => {
    useNotesStore.setState({ items: [], backlinks: {}, loaded: false });
    mockStorage.clear();
  });

  it("seeds Git Setup in Termux guidance when storage is empty", async () => {
    await useNotesStore.getState().load();

    const { items } = useNotesStore.getState();
    const gitSetup = items.find((item) => item.title === "Git Setup in Termux");

    expect(gitSetup).toBeDefined();
    expect(gitSetup?.content).toContain("git config --global user.name");
    expect(gitSetup?.content).toContain("git config --global user.email");
    expect(gitSetup?.content).toContain("Settings → Emails");
  });
});
