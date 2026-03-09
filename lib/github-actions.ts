/**
 * GitHub action helpers for the AI assistant.
 *
 * These functions let the AI commit files to, and create branches in,
 * the user's connected GitHub repository.  They use the same GitHub REST
 * API pattern already established in store/github-store.ts but are
 * designed to be called from executeActions() in the AI chat screen
 * without touching React state.
 */

export interface GitHubActionResult {
  success: boolean;
  /** Short human-readable description shown to the user. */
  message: string;
  /** Extra detail (e.g. commit SHA, branch URL) */
  detail?: string;
}

interface BlobItem {
  path: string;
  mode: "100644";
  type: "blob";
  sha: string;
}

const GH = "https://api.github.com";

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

/**
 * Commit one or more files to the default (or specified) branch of a repo.
 *
 * @param token   GitHub Personal Access Token with `repo` scope
 * @param owner   Repository owner (user or org)
 * @param repo    Repository name
 * @param files   Array of { path, content } objects to write
 * @param message Commit message
 * @param branch  Target branch (defaults to the repo's default branch)
 */
export async function commitFiles(
  token: string,
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  message: string,
  branch?: string,
): Promise<GitHubActionResult> {
  try {
    // 1. Resolve the branch name
    const repoRes = await fetch(`${GH}/repos/${owner}/${repo}`, {
      headers: ghHeaders(token),
    });
    if (!repoRes.ok) {
      return { success: false, message: `Could not access repo ${owner}/${repo}.` };
    }
    const repoData = await repoRes.json();
    const targetBranch: string = branch ?? repoData.default_branch ?? "main";

    // 2. Get latest commit SHA on the branch
    const refRes = await fetch(
      `${GH}/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
      { headers: ghHeaders(token) },
    );
    if (!refRes.ok) {
      return { success: false, message: `Branch "${targetBranch}" not found.` };
    }
    const refData = await refRes.json();
    const latestCommitSha: string = refData.object?.sha;

    // 3. Get base tree SHA
    const commitRes = await fetch(
      `${GH}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      { headers: ghHeaders(token) },
    );
    const commitData = await commitRes.json();
    const baseTreeSha: string = commitData.tree?.sha;

    // 4. Create blobs
    const treeItems: BlobItem[] = await Promise.all(
      files.map(async (f) => {
        const blobRes = await fetch(
          `${GH}/repos/${owner}/${repo}/git/blobs`,
          {
            method: "POST",
            headers: ghHeaders(token),
            body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
          },
        );
        const blob = await blobRes.json();
        return { path: f.path, mode: "100644", type: "blob", sha: blob.sha };
      }),
    );

    // 5. Create tree
    const treeRes = await fetch(
      `${GH}/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers: ghHeaders(token),
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
      },
    );
    const treeData = await treeRes.json();

    // 6. Create commit
    const newCommitRes = await fetch(
      `${GH}/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers: ghHeaders(token),
        body: JSON.stringify({
          message,
          tree: treeData.sha,
          parents: [latestCommitSha],
        }),
      },
    );
    const newCommit = await newCommitRes.json();

    // 7. Update branch ref
    const updateRes = await fetch(
      `${GH}/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      {
        method: "PATCH",
        headers: ghHeaders(token),
        body: JSON.stringify({ sha: newCommit.sha }),
      },
    );
    if (!updateRes.ok) {
      return { success: false, message: "Commit created but failed to update branch ref." };
    }

    const shortSha: string = (newCommit.sha as string).slice(0, 7);
    return {
      success: true,
      message: `Committed ${files.length} file${files.length !== 1 ? "s" : ""} to ${targetBranch} (${shortSha}).`,
      detail: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Commit failed: ${msg}` };
  }
}

/**
 * Create a new branch in the repository.
 *
 * @param token      GitHub Personal Access Token
 * @param owner      Repository owner
 * @param repo       Repository name
 * @param branchName Name for the new branch
 * @param fromBranch Source branch (defaults to the repo's default branch)
 */
export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch?: string,
): Promise<GitHubActionResult> {
  try {
    // Get source branch (default if not specified)
    let sourceBranch = fromBranch;
    if (!sourceBranch) {
      const repoRes = await fetch(`${GH}/repos/${owner}/${repo}`, {
        headers: ghHeaders(token),
      });
      const repoData = await repoRes.json();
      sourceBranch = repoData.default_branch ?? "main";
    }

    // Get source branch SHA
    const refRes = await fetch(
      `${GH}/repos/${owner}/${repo}/git/ref/heads/${sourceBranch}`,
      { headers: ghHeaders(token) },
    );
    if (!refRes.ok) {
      return { success: false, message: `Source branch "${sourceBranch}" not found.` };
    }
    const refData = await refRes.json();
    const sha: string = refData.object?.sha;

    // Create new ref
    const createRes = await fetch(
      `${GH}/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        headers: ghHeaders(token),
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
      },
    );
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return {
        success: false,
        message: (err as { message?: string }).message
          ? `Branch creation failed: ${(err as { message: string }).message}`
          : `Could not create branch "${branchName}".`,
      };
    }

    return {
      success: true,
      message: `Branch "${branchName}" created from "${sourceBranch}".`,
      detail: `https://github.com/${owner}/${repo}/tree/${branchName}`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Branch creation failed: ${msg}` };
  }
}

/**
 * Read a single file from the repository.
 *
 * @param token  GitHub Personal Access Token
 * @param owner  Repository owner
 * @param repo   Repository name
 * @param path   File path within the repo (e.g. "src/index.ts")
 * @param branch Branch or ref (defaults to HEAD)
 */
export async function readFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch?: string,
): Promise<GitHubActionResult & { fileContent?: string }> {
  try {
    const encodedPath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const url = `${GH}/repos/${owner}/${repo}/contents/${encodedPath}${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`;
    const res = await fetch(url, { headers: ghHeaders(token) });
    if (!res.ok) {
      return { success: false, message: `File "${path}" not found in repo.` };
    }
    const data = await res.json();
    // GitHub returns base64-encoded content
    const content = atob((data.content as string).replace(/\n/g, ""));
    return {
      success: true,
      message: `Read "${path}" (${content.length} chars).`,
      fileContent: content,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Read failed: ${msg}` };
  }
}
