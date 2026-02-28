import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

export type ItemType = "note" | "code" | "folder";

export interface NoteItem {
  id: string;
  type: ItemType;
  title: string;
  content: string;
  language?: string; // for code files
  parentId: string | null;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BacklinksMap {
  [noteId: string]: string[]; // noteId -> array of IDs that link to it
}

interface NotesState {
  items: NoteItem[];
  backlinks: BacklinksMap;
  loaded: boolean;
  load: () => Promise<void>;
  save: () => Promise<void>;
  createItem: (data: Partial<NoteItem> & { title: string; type: ItemType }) => NoteItem;
  updateItem: (id: string, data: Partial<NoteItem>) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => NoteItem | undefined;
  getChildren: (parentId: string | null) => NoteItem[];
  searchItems: (query: string) => NoteItem[];
  getBacklinks: (id: string) => NoteItem[];
  rebuildBacklinks: () => void;
  togglePin: (id: string) => void;
}

const STORAGE_KEY = "notewise_items";

/** Extract [[link title]] patterns from markdown content */
export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return links;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  items: [],
  backlinks: {},
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const items: NoteItem[] = JSON.parse(raw);
        const state = get();
        set({ items, loaded: true });
        state.rebuildBacklinks();
      } else {
        // Seed with welcome note
        const welcome: NoteItem = {
          id: uuidv4(),
          type: "note",
          title: "Welcome to Notewise",
          content: `# Welcome to Notewise 🧠\n\nThis is your personal knowledge base.\n\n## Features\n- **Wiki-style links**: Type \`[[\` to link to another note\n- **AI Assistant**: Ask the AI to create notes and folders\n- **Code Editor**: Monaco-powered syntax highlighting\n- **GitHub Sync**: Push your notes to a GitHub repo\n\n## Getting Started\nCreate your first note using the **+** button, or ask the AI to set up your knowledge base!\n`,
          parentId: null,
          tags: ["welcome"],
          pinned: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const gettingStarted: NoteItem = {
          id: uuidv4(),
          type: "note",
          title: "Getting Started",
          content: `# Getting Started\n\nSee [[Welcome to Notewise]] for an overview.\n\n## Creating Notes\nTap the **+** button on the Notes tab.\n\n## Linking Notes\nType \`[[\` anywhere in a note to get a list of existing notes to link to.\n\n## Code Files\nCreate a code file from the **+** menu to get syntax-highlighted editing.\n`,
          parentId: null,
          tags: ["guide"],
          pinned: false,
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
        };
        const items = [welcome, gettingStarted];
        set({ items, loaded: true });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        get().rebuildBacklinks();
      }
    } catch (e) {
      console.error("Failed to load notes:", e);
      set({ loaded: true });
    }
  },

  save: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().items));
    } catch (e) {
      console.error("Failed to save notes:", e);
    }
  },

  createItem: (data) => {
    const item: NoteItem = {
      id: uuidv4(),
      type: data.type,
      title: data.title,
      content: data.content ?? (data.type === "folder" ? "" : `# ${data.title}\n\n`),
      language: data.language,
      parentId: data.parentId ?? null,
      tags: data.tags ?? [],
      pinned: data.pinned ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({ items: [...state.items, item] }));
    get().save();
    get().rebuildBacklinks();
    return item;
  },

  updateItem: (id, data) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...data, updatedAt: Date.now() } : item
      ),
    }));
    get().save();
    get().rebuildBacklinks();
  },

  deleteItem: (id) => {
    // Also delete all children recursively
    const getAllDescendants = (parentId: string): string[] => {
      const children = get().items.filter((i) => i.parentId === parentId);
      return [parentId, ...children.flatMap((c) => getAllDescendants(c.id))];
    };
    const toDelete = new Set(getAllDescendants(id));
    set((state) => ({ items: state.items.filter((i) => !toDelete.has(i.id)) }));
    get().save();
    get().rebuildBacklinks();
  },

  getItem: (id) => get().items.find((i) => i.id === id),

  getChildren: (parentId) =>
    get().items.filter((i) => i.parentId === parentId),

  searchItems: (query) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return get().items.filter(
      (i) =>
        i.type !== "folder" &&
        (i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q))
    );
  },

  getBacklinks: (id) => {
    const bl = get().backlinks[id] ?? [];
    return bl.map((bid) => get().items.find((i) => i.id === bid)).filter(Boolean) as NoteItem[];
  },

  rebuildBacklinks: () => {
    const { items } = get();
    const bl: BacklinksMap = {};
    for (const item of items) {
      if (item.type === "folder") continue;
      const linkTitles = extractWikiLinks(item.content);
      for (const title of linkTitles) {
        const target = items.find((i) => i.title.toLowerCase() === title.toLowerCase());
        if (target) {
          if (!bl[target.id]) bl[target.id] = [];
          if (!bl[target.id].includes(item.id)) {
            bl[target.id].push(item.id);
          }
        }
      }
    }
    set({ backlinks: bl });
  },

  togglePin: (id) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, pinned: !i.pinned, updatedAt: Date.now() } : i
      ),
    }));
    get().save();
  },
}));
