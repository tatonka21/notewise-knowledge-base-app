# KnowledgeBase App — Design Document

## App Concept
A mobile-first personal knowledge base with wiki-style `[[note linking]]`, AI assistant, Monaco-style code editing, folder/file tree organization, and GitHub sync.

---

## Color Palette
- **Primary**: `#6366F1` (Indigo — intellectual, focused)
- **Background**: `#0F0F13` dark / `#F8F8FC` light
- **Surface**: `#1A1A24` dark / `#FFFFFF` light
- **Sidebar**: `#13131C` dark / `#F0F0F8` light
- **Accent**: `#A78BFA` (violet for links/highlights)
- **Success**: `#34D399`
- **Warning**: `#FBBF24`
- **Error**: `#F87171`
- **Code bg**: `#0D1117` (GitHub dark)

---

## Screen List

### 1. Home / Notes List (`/`)
- Tab: "Notes" with book icon
- Shows recent notes + pinned notes
- Quick search bar at top
- Floating "+" button to create note/folder

### 2. Sidebar / File Tree (`/explorer`)
- Tab: "Explorer" with folder icon
- Collapsible folder tree
- Long-press context menu: rename, delete, move
- Drag-to-reorder (future)

### 3. Note Editor (`/editor/[id]`)
- Full-screen markdown editor
- `[[link]]` wiki-style autocomplete
- Toolbar: Bold, Italic, Code, Link, Heading, List
- Toggle: Edit ↔ Preview mode
- Backlinks panel (which notes link here)

### 4. Code Editor (`/code/[id]`)
- Monaco-style syntax-highlighted editor (via WebView + Monaco CDN)
- Language selector (JS, TS, Python, JSON, etc.)
- Line numbers, bracket matching, auto-indent

### 5. AI Assistant (`/ai`)
- Tab: "AI" with sparkle icon
- Chat interface with the AI
- AI can: create notes, create folders, search notes, insert links
- Code generation with Monaco preview

### 6. GitHub (`/github`)
- Tab: "GitHub" with git icon
- Connect via Personal Access Token
- Repo browser: clone, push, pull
- Commit history viewer
- Diff viewer for changed files

### 7. Settings (`/settings`)
- Theme toggle (dark/light)
- Editor font size
- GitHub connection status
- Export vault (zip)

---

## Key User Flows

### Create a Note with Wiki Link
1. User taps "+" → "New Note"
2. Types note title → opens editor
3. Types `[[` → autocomplete popup shows existing notes
4. Selects note → inserts `[[Note Title]]` link
5. Taps link in preview → navigates to linked note

### AI Creates a Folder + Notes
1. User opens AI tab
2. Types: "Create a folder called 'React' with notes for hooks, state, and props"
3. AI creates folder + 3 notes with content
4. User sees confirmation with links to created items

### GitHub Sync
1. User goes to GitHub tab
2. Enters PAT + repo URL → connects
3. Taps "Push" → commits all notes as markdown files
4. Taps "Pull" → imports markdown files as notes

---

## Navigation Structure
- Bottom tab bar: Notes | Explorer | AI | GitHub | Settings
- Stack navigator inside each tab for drill-down
- Modal sheets for: new note/folder, link picker, AI chat

---

## Data Model

```typescript
type NoteItem = {
  id: string;
  type: 'note' | 'code' | 'folder';
  title: string;
  content: string;        // markdown or code
  language?: string;      // for code files
  parentId: string | null;
  tags: string[];
  links: string[];        // IDs of linked notes
  backlinks: string[];    // IDs of notes linking to this
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};
```
