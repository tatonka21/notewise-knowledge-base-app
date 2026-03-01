import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateUUID } from "../lib/uuid";
import { create } from "zustand";

export interface GeneratedApp {
  id: string;
  type: "app" | "website";
  name: string;
  description: string;
  code: string; // Full app/website code
  preview?: string; // HTML preview for websites
  createdAt: number;
  updatedAt: number;
  buildStatus?: "idle" | "building" | "success" | "error";
  buildError?: string;
  apkUrl?: string; // URL to downloaded APK
}

interface GeneratedAppsState {
  apps: GeneratedApp[];
  loaded: boolean;
  load: () => Promise<void>;
  save: () => Promise<void>;
  addApp: (app: Omit<GeneratedApp, "id" | "createdAt" | "updatedAt">) => GeneratedApp;
  deleteApp: (id: string) => void;
  updateApp: (id: string, updates: Partial<GeneratedApp>) => void;
  getApp: (id: string) => GeneratedApp | undefined;
}

const STORAGE_KEY = "notewise_generated_apps";

export const useGeneratedAppsStore = create<GeneratedAppsState>((set, get) => ({
  apps: [],
  loaded: false,

  load: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const apps = JSON.parse(data);
        set({ apps, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch (e) {
      console.error("Failed to load generated apps:", e);
      set({ loaded: true });
    }
  },

  save: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().apps));
    } catch (e) {
      console.error("Failed to save generated apps:", e);
    }
  },

  addApp: (app) => {
    const newApp: GeneratedApp = {
      ...app,
      id: generateUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      buildStatus: "idle",
    };
    set((state) => {
      const apps = [...state.apps, newApp];
      state.save();
      return { apps };
    });
    return newApp;
  },

  deleteApp: (id) => {
    set((state) => {
      const apps = state.apps.filter((a) => a.id !== id);
      state.save();
      return { apps };
    });
  },

  updateApp: (id, updates) => {
    set((state) => {
      const apps = state.apps.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
      );
      state.save();
      return { apps };
    });
  },

  getApp: (id) => {
    return get().apps.find((a) => a.id === id);
  },
}));
