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
      .mutation(async ({ input, ctx }) => {
        const { messages, notesContext } = input;

        const notesContextStr = notesContext && notesContext.length > 0
          ? `\n\nCurrent knowledge base structure:\n${notesContext
              .map((n) => `- [${n.type}] "${n.title}" (id: ${n.id})${n.parentId ? ` in folder ${n.parentId}` : ""}`)
              .join("\n")}`
          : "";

        const systemPrompt = `You are Notewise AI, an intelligent assistant for a personal knowledge base app running on Android.\nYou help users organize their knowledge, create notes, write code, manage their vault, and interact with their device.\n\nYou can perform actions by responding with a JSON block in this exact format (alongside your text response):\n\`\`\`actions\n[\n  { "action": "create_note", "title": "Note Title", "content": "# Note Title\\n\\nContent here", "parentId": null },\n  { "action": "create_folder", "title": "Folder Name", "parentId": null },\n  { "action": "create_code", "title": "filename.js", "content": "// code here", "language": "javascript", "parentId": null },\n  { "action": "update_note", "id": "note-id", "content": "new content" },\n  { "action": "open_url", "url": "https://example.com", "title": "Open website" },\n  { "action": "launch_app", "url": "youtube://", "title": "Open YouTube" },\n  { "action": "make_call", "phone": "5551234567", "title": "Call number" },\n  { "action": "send_sms", "phone": "5551234567", "body": "Hello!", "title": "Send SMS" },\n  { "action": "send_email", "to": "user@example.com", "subject": "Subject", "body": "Body text", "title": "Send email" },\n  { "action": "share_text", "text": "Content to share", "title": "Share" },\n  { "action": "open_maps", "query": "coffee shops near me", "title": "Find coffee" },\n  { "action": "open_settings", "path": "wifi", "title": "Open Wi-Fi settings" }\n]\n\`\`\`\n\nDevice action rules:\n- Use "open_url" to open websites or any https:// URL in the browser\n- Use "launch_app" with a URI/deep-link to open other installed apps (e.g. "youtube://", "instagram://", "spotify://", "com.whatsapp")\n- Use "make_call" to open the dialer pre-filled with a phone number\n- Use "send_sms" to open the SMS app with a number and optional pre-filled message\n- Use "send_email" to open the email app with recipient, subject, and body pre-filled\n- Use "share_text" to open the Android share sheet so the user can send text to any app\n- Use "open_maps" to search for a location or business in the maps app\n- Use "open_settings" with path "app", "wifi", "bluetooth", "location", "display", "sound", or "apps"\n- You can combine knowledge-base actions and device actions in the same actions block\n- Always explain what you are about to do before including device actions\n\nKnowledge-base rules:\n- Always include the actions block when the user asks you to create/modify notes or folders\n- Use [[Note Title]] wiki-link syntax in note content to link related notes\n- For code files, always specify the language\n- Be concise but helpful in your text response\n- You have Monaco editor capabilities: you can write any programming language\n- When creating multiple related notes, link them together with [[links]]${notesContextStr}`;

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
          return { success: true, app: appData };
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
          return { success: true, website: websiteData };
        } catch (e) {
          console.error("Failed to parse website generation response:", e);
          return { success: false, error: "Failed to generate website" };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
