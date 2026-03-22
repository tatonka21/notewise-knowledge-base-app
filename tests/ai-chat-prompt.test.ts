import { describe, expect, it } from "vitest";

import { buildAiChatSystemPrompt } from "../server/_core/ai-chat-prompt";

describe("buildAiChatSystemPrompt", () => {
  it("tells the assistant to handle typo-heavy user input helpfully", () => {
    const prompt = buildAiChatSystemPrompt({});

    expect(prompt).toContain("Be tolerant of typos, shorthand, and informal phrasing.");
    expect(prompt).toContain("interpret it helpfully and respond with polished wording");
  });

  it("includes available note and GitHub context", () => {
    const prompt = buildAiChatSystemPrompt({
      notesContext: [
        {
          id: "folder-1",
          title: "Leadership",
          type: "folder",
          parentId: null,
        },
        {
          id: "note-1",
          title: "VP Questions",
          type: "note",
          parentId: "folder-1",
        },
      ],
      githubContext: {
        connected: true,
        owner: "tatonka21",
        repo: "notewise-knowledge-base-app",
      },
    });

    expect(prompt).toContain('Current knowledge base structure:\n- [folder] "Leadership" (id: folder-1)');
    expect(prompt).toContain('- [note] "VP Questions" (id: note-1) in folder folder-1');
    expect(prompt).toContain("Connected GitHub repository: tatonka21/notewise-knowledge-base-app");
  });
});
