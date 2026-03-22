import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { buildAiChatSystemPrompt } from "./_core/ai-chat-prompt";
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
          githubContext: z.object({
            connected: z.boolean(),
            owner: z.string().nullable(),
            repo: z.string().nullable(),
          }).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { messages, notesContext, githubContext } = input;
        const systemPrompt = buildAiChatSystemPrompt({ notesContext, githubContext });

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        }, ctx.userApiKey);

        const content = (response.choices[0]?.message?.content as string) ?? "";

        const actionsMatch = content.match(/```actions\n([\s\S]*?)\n```/);
        let actions: Array<{
          action: string;
          title?: string;
          content?: string;
          parentId?: string | null;
          language?: string;
          id?: string;
          // device-action fields
          url?: string;
          phone?: string;
          body?: string;
          to?: string;
          subject?: string;
          text?: string;
          query?: string;
          path?: string;
          // github-action fields
          files?: Array<{ path: string; content: string }>;
          message?: string;
          branch?: string;
          fromBranch?: string;
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
      .mutation(async ({ input, ctx }) => {
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
        }, ctx.userApiKey);

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
      .mutation(async ({ input, ctx }) => {
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
        }, ctx.userApiKey);

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
