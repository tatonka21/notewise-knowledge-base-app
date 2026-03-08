/**
 * Unit tests for lib/github-actions.ts
 *
 * All GitHub REST calls are mocked via vi.hoisted + vi.mock so the
 * tests run without a network connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock fetch ────────────────────────────────────────────────────────────

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("fetch", mockFetch);

// Mock atob for the readFile test (not available in the jsdom-less test env)
vi.stubGlobal("atob", (s: string) => Buffer.from(s, "base64").toString("utf8"));

import {
  commitFiles,
  createBranch,
  readFile,
} from "../lib/github-actions";

// ── Helpers ───────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const TOKEN = "ghp_test_token";
const OWNER = "testuser";
const REPO = "testrepo";

// ── commitFiles ───────────────────────────────────────────────────────────

describe("commitFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commits files successfully and returns commit SHA info", async () => {
    // Sequence of GitHub API calls:
    // 1. GET /repos/:owner/:repo
    // 2. GET /repos/:owner/:repo/git/ref/heads/main
    // 3. GET /repos/:owner/:repo/git/commits/:sha
    // 4. POST /repos/:owner/:repo/git/blobs (×1 file)
    // 5. POST /repos/:owner/:repo/git/trees
    // 6. POST /repos/:owner/:repo/git/commits
    // 7. PATCH /repos/:owner/:repo/git/refs/heads/main
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" })) // 1
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "latestSHA" } })) // 2
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: "baseTreeSHA" } })) // 3
      .mockResolvedValueOnce(jsonResponse({ sha: "blobSHA" })) // 4
      .mockResolvedValueOnce(jsonResponse({ sha: "newTreeSHA" })) // 5
      .mockResolvedValueOnce(jsonResponse({ sha: "a1b2c3d4e5f6" })) // 6
      .mockResolvedValueOnce(jsonResponse({})); // 7 PATCH

    const result = await commitFiles(
      TOKEN,
      OWNER,
      REPO,
      [{ path: "src/hello.ts", content: "console.log('hi')" }],
      "feat: add hello",
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("1 file");
    expect(result.message).toContain("main");
    expect(result.message).toContain("a1b2c3");
    expect(result.detail).toContain("a1b2c3d4e5f6");
  });

  it("commits multiple files", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "s1" } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: "t1" } }))
      .mockResolvedValueOnce(jsonResponse({ sha: "b1" })) // blob for file 1
      .mockResolvedValueOnce(jsonResponse({ sha: "b2" })) // blob for file 2
      .mockResolvedValueOnce(jsonResponse({ sha: "t2" }))
      .mockResolvedValueOnce(jsonResponse({ sha: "deadbeef1234" }))
      .mockResolvedValueOnce(jsonResponse({}));

    const result = await commitFiles(
      TOKEN,
      OWNER,
      REPO,
      [
        { path: "file1.ts", content: "a" },
        { path: "file2.ts", content: "b" },
      ],
      "chore: two files",
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("2 files");
  });

  it("uses the specified branch instead of the default", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "s1" } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: "t1" } }))
      .mockResolvedValueOnce(jsonResponse({ sha: "b1" }))
      .mockResolvedValueOnce(jsonResponse({ sha: "t2" }))
      .mockResolvedValueOnce(jsonResponse({ sha: "abc0000" }))
      .mockResolvedValueOnce(jsonResponse({}));

    const result = await commitFiles(TOKEN, OWNER, REPO, [{ path: "x.ts", content: "" }], "msg", "feat/branch");

    expect(result.success).toBe(true);
    // The PATCH URL should have been called with feat/branch
    const patchCall = mockFetch.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === "PATCH",
    );
    expect((patchCall?.[0] as string)).toContain("feat/branch");
  });

  it("returns failure when repo is not accessible", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));
    const result = await commitFiles(TOKEN, OWNER, REPO, [{ path: "f", content: "" }], "msg");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Could not access repo/);
  });

  it("returns failure when branch ref not found", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({}, 404));
    const result = await commitFiles(TOKEN, OWNER, REPO, [{ path: "f", content: "" }], "msg");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found/);
  });

  it("returns failure when PATCH to update ref fails", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "s1" } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: "t1" } }))
      .mockResolvedValueOnce(jsonResponse({ sha: "b1" }))
      .mockResolvedValueOnce(jsonResponse({ sha: "t2" }))
      .mockResolvedValueOnce(jsonResponse({ sha: "newsha" }))
      .mockResolvedValueOnce(jsonResponse({}, 422));
    const result = await commitFiles(TOKEN, OWNER, REPO, [{ path: "f", content: "" }], "msg");
    expect(result.success).toBe(false);
  });

  it("handles fetch exceptions gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    const result = await commitFiles(TOKEN, OWNER, REPO, [{ path: "f", content: "" }], "msg");
    expect(result.success).toBe(false);
    expect(result.message).toContain("network down");
  });
});

// ── createBranch ──────────────────────────────────────────────────────────

describe("createBranch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a branch from the default branch", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" })) // GET repo
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "sha123" } })) // GET ref
      .mockResolvedValueOnce(jsonResponse({ ref: "refs/heads/feat/new" })); // POST refs

    const result = await createBranch(TOKEN, OWNER, REPO, "feat/new");
    expect(result.success).toBe(true);
    expect(result.message).toContain("feat/new");
    expect(result.message).toContain("main");
    expect(result.detail).toContain("feat/new");
  });

  it("creates a branch from a specified source branch", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "sha456" } })) // GET ref for develop
      .mockResolvedValueOnce(jsonResponse({})); // POST refs

    const result = await createBranch(TOKEN, OWNER, REPO, "fix/bug", "develop");
    expect(result.success).toBe(true);
    expect(result.message).toContain("develop");
    expect(result.message).toContain("fix/bug");
  });

  it("returns failure when source branch not found", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({}, 404));
    const result = await createBranch(TOKEN, OWNER, REPO, "feat/x");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found/);
  });

  it("returns failure when GitHub rejects the new ref", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ default_branch: "main" }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "sha" } }))
      .mockResolvedValueOnce(jsonResponse({ message: "Reference already exists" }, 422));
    const result = await createBranch(TOKEN, OWNER, REPO, "existing-branch");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Reference already exists/);
  });
});

// ── readFile ──────────────────────────────────────────────────────────────

describe("readFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads and decodes a file from the repo", async () => {
    const encoded = Buffer.from("hello world", "utf8").toString("base64");
    mockFetch.mockResolvedValueOnce(jsonResponse({ content: encoded }));

    const result = await readFile(TOKEN, OWNER, REPO, "src/index.ts");
    expect(result.success).toBe(true);
    expect(result.fileContent).toBe("hello world");
    expect(result.message).toContain("src/index.ts");
  });

  it("reads a file from a specific branch", async () => {
    const encoded = Buffer.from("branched", "utf8").toString("base64");
    mockFetch.mockResolvedValueOnce(jsonResponse({ content: encoded }));

    const result = await readFile(TOKEN, OWNER, REPO, "README.md", "feat/x");
    expect(result.success).toBe(true);
    expect(result.fileContent).toBe("branched");
    const urlUsed = mockFetch.mock.calls[0][0] as string;
    expect(urlUsed).toContain("ref=feat%2Fx");
  });

  it("returns failure when file does not exist", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));
    const result = await readFile(TOKEN, OWNER, REPO, "missing.ts");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found/);
  });

  it("handles fetch exceptions gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("timeout"));
    const result = await readFile(TOKEN, OWNER, REPO, "any.ts");
    expect(result.success).toBe(false);
    expect(result.message).toContain("timeout");
  });
});
