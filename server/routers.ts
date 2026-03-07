import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { saveGeneratedApp, listGeneratedApps } from "./db";

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

    generateApp: publicProcedure
      .input(
        z.object({
          description: z.string(),
          appName: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { description, appName } = input;

        const prompt = `You are an expert React Native developer. Generate a complete, production-ready React Native app based on this description:

"${description}"

App name: ${appName}

Respond with ONLY valid JSON (no markdown, no code blocks, just raw JSON) with this exact structure:
{
  "appName": "${appName}",
  "description": "Brief description",
  "screens": [
    {
      "name": "Home",
      "component": "// Full React Native component code here"
    }
  ],
  "mainFile": "// App.tsx or index.tsx entry point code",
  "packageJson": {
    "dependencies": { "react-native": "0.81.5", "react": "19.1.0" }
  }
}

Make sure:
- All code is syntactically correct React Native
- Use Expo-compatible APIs only
- Include proper imports
- Use TypeScript
- Make it visually appealing with proper styling
- Include at least 2-3 screens if applicable`;

        const response = await invokeLLM({
          messages: [
            { role: "user", content: prompt },
          ],
        });

        const content = (response.choices[0]?.message?.content as string) ?? "";
        
        try {
          const appData = JSON.parse(content);
          const id = crypto.randomUUID();
          const code = appData.mainFile ?? JSON.stringify(appData, null, 2);
          await saveGeneratedApp({
            id,
            type: "app",
            name: appData.appName ?? appName,
            description: appData.description ?? description,
            code,
          });
          return { success: true, app: { ...appData, id } };
        } catch (e) {
          console.error("Failed to parse app generation response:", e);
          return { success: false, error: "Failed to generate app" };
        }
      }),

    generateWebsite: publicProcedure
      .input(
        z.object({
          description: z.string(),
          siteName: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { description, siteName } = input;

        const prompt = `You are an expert web developer. Generate a complete, modern website based on this description:

"${description}"

Site name: ${siteName}

Respond with ONLY valid JSON (no markdown, no code blocks, just raw JSON) with this exact structure:
{
  "siteName": "${siteName}",
  "description": "Brief description",
  "html": "<!-- Complete HTML with inline CSS and JavaScript -->",
  "pages": [
    {
      "name": "index.html",
      "content": "<!-- HTML content -->"
    }
  ]
}

Make sure:
- HTML is complete and self-contained
- Include inline CSS (no external stylesheets)
- Include inline JavaScript if needed
- Make it responsive and mobile-friendly
- Use modern design principles
- Include proper meta tags
- Make it visually appealing`;

        const response = await invokeLLM({
          messages: [
            { role: "user", content: prompt },
          ],
        });

        const content = (response.choices[0]?.message?.content as string) ?? "";
        
        try {
          const websiteData = JSON.parse(content);
          const id = crypto.randomUUID();
          const code = websiteData.html ?? JSON.stringify(websiteData, null, 2);
          await saveGeneratedApp({
            id,
            type: "website",
            name: websiteData.siteName ?? siteName,
            description: websiteData.description ?? description,
            code,
            preview: websiteData.html,
          });
          return { success: true, website: { ...websiteData, id } };
        } catch (e) {
          console.error("Failed to parse website generation response:", e);
          return { success: false, error: "Failed to generate website" };
        }
      }),

    listApps: publicProcedure.query(async () => {
      return listGeneratedApps();
    }),
  }),
});

export type AppRouter = typeof appRouter;
