import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  ai: router({
    chat: publicProcedure
      .input(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["user", "assistant", "system"]),
              content: z.string(),
            })
          ),
          notesContext: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              type: z.enum(["note", "code", "folder"]),
              parentId: z.string().nullable(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { messages, notesContext } = input;

        const notesContextStr = notesContext && notesContext.length > 0
          ? `\n\nCurrent knowledge base structure:\n${notesContext
              .map((n) => `- [${n.type}] "${n.title}" (id: ${n.id})${n.parentId ? ` in folder ${n.parentId}` : ""}`)
              .join("\n")}`
          : "";

        const systemPrompt = `You are Notewise AI, an intelligent assistant for a personal knowledge base app.\nYou help users organize their knowledge, create notes, write code, and manage their vault.\n\nYou can perform actions by responding with a JSON block in this exact format (alongside your text response):\n\`\`\`actions\n[\n  { "action": "create_note", "title": "Note Title", "content": "# Note Title\\n\\nContent here", "parentId": null },\n  { "action": "create_folder", "title": "Folder Name", "parentId": null },\n  { "action": "create_code", "title": "filename.js", "content": "// code here", "language": "javascript", "parentId": null },\n  { "action": "update_note", "id": "note-id", "content": "new content" }\n]\n\`\`\`\n\nRules:\n- Always include the actions block when the user asks you to create/modify notes or folders\n- Use [[Note Title]] wiki-link syntax in note content to link related notes\n- For code files, always specify the language\n- Be concise but helpful in your text response\n- You have Monaco editor capabilities: you can write any programming language\n- When creating multiple related notes, link them together with [[links]]${notesContextStr}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        });

        const content = (response.choices[0]?.message?.content as string) ?? "";

        const actionsMatch = content.match(/```actions\n([\s\S]*?)\n```/);
        let actions: Array<{
          action: string;
          title?: string;
          content?: string;
          parentId?: string | null;
          language?: string;
          id?: string;
        }> = [];

        if (actionsMatch) {
          try {
            actions = JSON.parse(actionsMatch[1]);
          } catch {
            actions = [];
          }
        }

        const cleanText = content.replace(/```actions\n[\s\S]*?\n```/g, "").trim();

        return { text: cleanText, actions };
      }),
  }),
});

export type AppRouter = typeof appRouter;
