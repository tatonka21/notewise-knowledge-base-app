# KnowledgeBase App TODO

## Core Data Layer
- [x] AsyncStorage-based notes/folders store with Zustand
- [x] Note data model (id, title, content, type, parentId, tags, links, backlinks)
- [x] CRUD operations for notes and folders
- [x] Wiki-link parser (extract [[links]] from content)
- [x] Backlinks index builder

## Navigation & Layout
- [x] Bottom tab bar: Notes, Explorer, AI, GitHub, Settings
- [x] Custom theme (indigo/violet palette)
- [x] Icon mappings for all tabs

## Notes Screen (Home)
- [x] Recent notes list
- [x] Pinned notes section
- [x] Search bar with live filtering
- [x] FAB (+) for new note/folder

## Explorer Screen (File Tree)
- [x] Recursive folder/file tree component
- [x] Expand/collapse folders
- [x] Long-press context menu (rename, delete, new child)
- [x] File type icons (note, code, folder)

## Note Editor
- [x] Markdown text editor with toolbar
- [x] [[link]] autocomplete popup
- [x] Edit / Preview toggle
- [x] Backlinks panel
- [x] Note metadata (tags, created/updated)

## Code Editor
- [x] Monaco editor via WebView
- [x] Language selector
- [x] Syntax highlighting for JS/TS/Python/JSON/etc.
- [x] Save code file to notes store

## AI Assistant
- [x] Chat UI with message bubbles
- [x] Server-side LLM integration (tRPC)
- [x] AI can create notes via tool calls
- [x] AI can create folders
- [x] AI can search/list notes
- [x] AI can insert wiki links
- [x] AI code generation with Monaco preview

## GitHub Integration
- [x] GitHub PAT input + save to SecureStore
- [x] Connect to repo (validate token + repo URL)
- [x] Push notes as markdown files
- [x] Pull markdown files as notes
- [x] Commit history viewer
- [x] Connection status indicator

## Settings
- [x] Dark/light theme toggle
- [x] Editor font size setting
- [x] GitHub connection status
- [ ] Export vault as zip (future enhancement)

## Branding
- [x] App icon generated
- [x] Theme colors updated
- [x] App name set to "Notewise"


## Bug Fixes
- [x] Fix crypto.getRandomValues() error in uuidv4() — implement React Native-compatible UUID generator
