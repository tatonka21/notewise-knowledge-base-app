export interface LayoutSchemeOption {
  id: "command-center" | "workspace-split" | "focused-flow";
  name: string;
  summary: string;
}

export interface ModuleCategory {
  id: "A" | "B" | "C" | "D" | "E" | "F";
  title: string;
  description: string;
}

export interface ModuleDefinition {
  id: number;
  title: string;
  purpose: string;
  categoryId: ModuleCategory["id"];
}

export const layoutSchemes: LayoutSchemeOption[] = [
  {
    id: "command-center",
    name: "Command Center",
    summary: "Dashboard first: quick access to projects, agents, and activity.",
  },
  {
    id: "workspace-split",
    name: "Workspace Split",
    summary: "Navigation rail + content pane for deep multi-module workflows.",
  },
  {
    id: "focused-flow",
    name: "Focused Flow",
    summary: "One primary task at a time with contextual tools on demand.",
  },
];

export const moduleCategories: ModuleCategory[] = [
  {
    id: "A",
    title: "Authentication / Core App",
    description: "Identity, dashboard, file management, and account preferences.",
  },
  {
    id: "B",
    title: "AI Coding Agents",
    description: "Agent chat, decomposition, execution, and development automation.",
  },
  {
    id: "C",
    title: "Knowledge Base / Docs",
    description: "Notes, documents, graph linking, semantic search, and summaries.",
  },
  {
    id: "D",
    title: "AI Project Management",
    description: "Project planning, tasks, milestones, requirements, and activity logs.",
  },
  {
    id: "E",
    title: "AI App / Web Builder",
    description: "Visual editing, components, code editing, preview, and deployment.",
  },
  {
    id: "F",
    title: "Backend / Hosting",
    description: "API generation, data management, and hosting operations.",
  },
];

export const moduleCatalog: ModuleDefinition[] = [
  { id: 1, title: "Authentication / User Accounts", purpose: "Login, signup, tokens, roles", categoryId: "A" },
  { id: 2, title: "Workspace Dashboard", purpose: "Central hub for all projects, files, agents", categoryId: "A" },
  { id: 3, title: "File System Explorer", purpose: "Files, folders, uploads, previews", categoryId: "A" },
  { id: 4, title: "Settings / Preferences", purpose: "Model selection, API keys, themes", categoryId: "A" },
  { id: 5, title: "Billing (Optional)", purpose: "Subscription and payment management", categoryId: "A" },
  { id: 6, title: "AI Coding Chat Interface", purpose: "Chat, code suggestions, and tool use", categoryId: "B" },
  { id: 7, title: "Task Decomposition Engine", purpose: "Break projects into 100–1000 tasks", categoryId: "B" },
  { id: 8, title: "Agent Task Runner", purpose: "Execute tasks sequentially", categoryId: "B" },
  { id: 9, title: "Code Execution Sandbox", purpose: "Run code, test, and debug", categoryId: "B" },
  { id: 10, title: "GitHub Integration Panel", purpose: "Commits, branches, PRs, CI/CD", categoryId: "B" },
  { id: 11, title: "Notes Editor", purpose: "Rich text, markdown, and AI-assisted writing", categoryId: "C" },
  { id: 12, title: "Document Viewer", purpose: "PDF, docs, and file previews", categoryId: "C" },
  { id: 13, title: "Knowledge Graph View", purpose: "Visual linking of ideas and notes", categoryId: "C" },
  { id: 14, title: "Semantic Search", purpose: "Vector search across notes and files", categoryId: "C" },
  { id: 15, title: "AI Summaries & Insights", purpose: "Auto-summarization and tagging", categoryId: "C" },
  { id: 16, title: "Project Overview Page", purpose: "Description, goals, metadata", categoryId: "D" },
  { id: 17, title: "Task Board (Kanban)", purpose: "To-do, doing, done workflow", categoryId: "D" },
  { id: 18, title: "Milestones / Sprints", purpose: "High-level planning and sequencing", categoryId: "D" },
  { id: 19, title: "Requirements / Specs Page", purpose: "User stories and acceptance criteria", categoryId: "D" },
  { id: 20, title: "Agent Activity Log", purpose: "Track what the agent did and why", categoryId: "D" },
  { id: 21, title: "AI Visual Editor (Canvas)", purpose: "Drag-and-drop UI builder", categoryId: "E" },
  { id: 22, title: "Component Library", purpose: "Buttons, forms, and reusable layouts", categoryId: "E" },
  { id: 23, title: "Code View (Monaco Editor)", purpose: "Full code editing workspace", categoryId: "E" },
  { id: 24, title: "Live Preview / Simulator", purpose: "Real-time rendering feedback", categoryId: "E" },
  { id: 25, title: "Deployment Panel", purpose: "Publish to web, mobile, and more", categoryId: "E" },
  { id: 26, title: "API Builder", purpose: "Auto-generate backend endpoints", categoryId: "F" },
  { id: 27, title: "Database Manager", purpose: "Tables, schema, and query controls", categoryId: "F" },
  { id: 28, title: "Hosting Dashboard", purpose: "Deploy backend with logs and metrics", categoryId: "F" },
];

export function getModulesByCategory(categoryId: ModuleCategory["id"]): ModuleDefinition[] {
  return moduleCatalog.filter((module) => module.categoryId === categoryId);
}

