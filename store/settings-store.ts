import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface SettingsState {
  fontSize: number;
  editorTheme: "dark" | "light";
  geminiApiKey: string;
  apiBaseUrl: string;
  loaded: boolean;
  load: () => Promise<void>;
  setFontSize: (size: number) => void;
  setEditorTheme: (theme: "dark" | "light") => void;
  setGeminiApiKey: (key: string) => void;
  setApiBaseUrl: (url: string) => void;
}

const SETTINGS_KEY = "notewise_settings";

export const useSettingsStore = create<SettingsState>((set, get) => ({
  fontSize: 15,
  editorTheme: "dark",
  geminiApiKey: "",
  apiBaseUrl: "",
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const settings = JSON.parse(raw);
        set({ ...settings, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setFontSize: (fontSize) => {
    set({ fontSize });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), fontSize }));
  },

  setEditorTheme: (editorTheme) => {
    set({ editorTheme });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), editorTheme }));
  },

  setGeminiApiKey: (geminiApiKey) => {
    set({ geminiApiKey });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), geminiApiKey }));
  },

  setApiBaseUrl: (apiBaseUrl) => {
    set({ apiBaseUrl });
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...get(), apiBaseUrl }));
  },
}));
