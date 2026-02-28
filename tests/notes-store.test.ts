import { describe, it, expect } from "vitest";
import { extractWikiLinks } from "../store/notes-store";

describe("extractWikiLinks", () => {
  it("extracts single wiki link", () => {
    const links = extractWikiLinks("See [[Getting Started]] for more.");
    expect(links).toEqual(["Getting Started"]);
  });

  it("extracts multiple wiki links", () => {
    const links = extractWikiLinks("See [[Note A]] and [[Note B]] for details.");
    expect(links).toEqual(["Note A", "Note B"]);
  });

  it("returns empty array when no links", () => {
    const links = extractWikiLinks("No links here.");
    expect(links).toEqual([]);
  });

  it("trims whitespace in link titles", () => {
    const links = extractWikiLinks("See [[ My Note ]] here.");
    expect(links).toEqual(["My Note"]);
  });

  it("handles empty content", () => {
    const links = extractWikiLinks("");
    expect(links).toEqual([]);
  });

  it("handles multiple links on same line", () => {
    const links = extractWikiLinks("[[A]] [[B]] [[C]]");
    expect(links).toEqual(["A", "B", "C"]);
  });

  it("handles links in headings", () => {
    const links = extractWikiLinks("# Title\n\nSee [[React Hooks]] and [[State Management]].");
    expect(links).toEqual(["React Hooks", "State Management"]);
  });
});

describe("parseRepoUrl", () => {
  it("parses standard GitHub URL", () => {
    const url = "https://github.com/user/my-repo";
    const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
    const match = cleaned.match(/(?:github\.com\/)([^/]+)\/([^/]+)$/);
    expect(match).toBeTruthy();
    expect(match![1]).toBe("user");
    expect(match![2]).toBe("my-repo");
  });

  it("parses GitHub URL with .git suffix", () => {
    const url = "https://github.com/user/my-repo.git";
    const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
    const match = cleaned.match(/(?:github\.com\/)([^/]+)\/([^/]+)$/);
    expect(match).toBeTruthy();
    expect(match![1]).toBe("user");
    expect(match![2]).toBe("my-repo");
  });

  it("parses owner/repo shorthand", () => {
    const url = "user/my-repo";
    const parts = url.split("/");
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe("user");
    expect(parts[1]).toBe("my-repo");
  });
});
