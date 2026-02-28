import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface GitHubState {
  token: string | null;
  repoUrl: string | null;
  repoOwner: string | null;
  repoName: string | null;
  connected: boolean;
  commits: GitHubCommit[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  connect: (token: string, repoUrl: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  pushNotes: (files: { path: string; content: string }[]) => Promise<boolean>;
  pullNotes: () => Promise<{ path: string; content: string }[]>;
  fetchCommits: () => Promise<void>;
}

const TOKEN_KEY = "notewise_gh_token";
const REPO_KEY = "notewise_gh_repo";

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function parseRepoUrl(url: string): { owner: string; name: string } | null {
  try {
    // Support formats: https://github.com/owner/repo or owner/repo
    const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
    const match = cleaned.match(/(?:github\.com\/)([^/]+)\/([^/]+)$/);
    if (match) return { owner: match[1], name: match[2] };
    const parts = cleaned.split("/");
    if (parts.length === 2) return { owner: parts[0], name: parts[1] };
    return null;
  } catch {
    return null;
  }
}

export const useGitHubStore = create<GitHubState>((set, get) => ({
  token: null,
  repoUrl: null,
  repoOwner: null,
  repoName: null,
  connected: false,
  commits: [],
  loading: false,
  error: null,

  load: async () => {
    const token = await secureGet(TOKEN_KEY);
    const repoUrl = await secureGet(REPO_KEY);
    if (token && repoUrl) {
      const parsed = parseRepoUrl(repoUrl);
      if (parsed) {
        set({
          token,
          repoUrl,
          repoOwner: parsed.owner,
          repoName: parsed.name,
          connected: true,
        });
      }
    }
  },

  connect: async (token, repoUrl) => {
    set({ loading: true, error: null });
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      set({ loading: false, error: "Invalid repository URL" });
      return false;
    }
    try {
      const res = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.name}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) {
        set({ loading: false, error: "Could not access repository. Check your token and URL." });
        return false;
      }
      await secureSet(TOKEN_KEY, token);
      await secureSet(REPO_KEY, repoUrl);
      set({
        token,
        repoUrl,
        repoOwner: parsed.owner,
        repoName: parsed.name,
        connected: true,
        loading: false,
        error: null,
      });
      return true;
    } catch (e) {
      set({ loading: false, error: "Network error. Please try again." });
      return false;
    }
  },

  disconnect: async () => {
    await secureDelete(TOKEN_KEY);
    await secureDelete(REPO_KEY);
    set({ token: null, repoUrl: null, repoOwner: null, repoName: null, connected: false, commits: [] });
  },

  pushNotes: async (files) => {
    const { token, repoOwner, repoName } = get();
    if (!token || !repoOwner || !repoName) return false;
    set({ loading: true, error: null });
    try {
      // Get default branch
      const repoRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      const repo = await repoRes.json();
      const branch = repo.default_branch ?? "main";

      // Get latest commit SHA
      const refRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${branch}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      const ref = await refRes.json();
      const latestCommitSha = ref.object?.sha;

      // Get base tree SHA
      const commitRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/commits/${latestCommitSha}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      const commit = await commitRes.json();
      const baseTreeSha = commit.tree?.sha;

      // Create blobs for each file
      const treeItems = await Promise.all(
        files.map(async (f) => {
          const blobRes = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/git/blobs`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
            }
          );
          const blob = await blobRes.json();
          return { path: f.path, mode: "100644", type: "blob", sha: blob.sha };
        })
      );

      // Create tree
      const treeRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
        }
      );
      const tree = await treeRes.json();

      // Create commit
      const newCommitRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/commits`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Notewise sync: ${new Date().toISOString()}`,
            tree: tree.sha,
            parents: [latestCommitSha],
          }),
        }
      );
      const newCommit = await newCommitRes.json();

      // Update ref
      await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/${branch}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sha: newCommit.sha }),
        }
      );

      set({ loading: false });
      await get().fetchCommits();
      return true;
    } catch (e) {
      set({ loading: false, error: "Push failed. Check your permissions." });
      return false;
    }
  },

  pullNotes: async () => {
    const { token, repoOwner, repoName } = get();
    if (!token || !repoOwner || !repoName) return [];
    set({ loading: true, error: null });
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/HEAD?recursive=1`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      const data = await res.json();
      const mdFiles = (data.tree ?? []).filter(
        (f: { path: string; type: string }) => f.type === "blob" && f.path.endsWith(".md")
      );

      const results: { path: string; content: string }[] = [];
      for (const file of mdFiles.slice(0, 50)) {
        const fileRes = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${file.path}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
        );
        const fileData = await fileRes.json();
        if (fileData.content) {
          const content = atob(fileData.content.replace(/\n/g, ""));
          results.push({ path: file.path, content });
        }
      }
      set({ loading: false });
      return results;
    } catch (e) {
      set({ loading: false, error: "Pull failed." });
      return [];
    }
  },

  fetchCommits: async () => {
    const { token, repoOwner, repoName } = get();
    if (!token || !repoOwner || !repoName) return;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=20`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        const commits: GitHubCommit[] = data.map((c: { sha: string; commit: { message: string; author: { name: string; date: string } } }) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0],
          author: c.commit.author?.name ?? "Unknown",
          date: c.commit.author?.date ?? "",
        }));
        set({ commits });
      }
    } catch {
      // silently fail
    }
  },
}));
