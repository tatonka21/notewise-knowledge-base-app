import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { useSettingsStore } from "@/store/settings-store";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 *
 * The URL is resolved at call-time from the settings store so that any
 * "API Server URL" the user has saved is used immediately. Re-call this
 * function (and swap the client in the provider) whenever `apiBaseUrl`
 * changes — see how `app/_layout.tsx` does this with a `useMemo`.
 *
 * The `X-Gemini-API-Key` header is resolved on every request so changes
 * to the key in Settings take effect without recreating the client.
 */
export function createTRPCClient() {
  const { apiBaseUrl } = useSettingsStore.getState();
  const base = (apiBaseUrl || getApiBaseUrl()).replace(/\/$/, "");

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${base}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          const { geminiApiKey } = useSettingsStore.getState();
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          // Forward the user's Gemini API key so the backend can use it
          // instead of (or as a fallback for) its own server-side key.
          if (geminiApiKey) headers["X-Gemini-API-Key"] = geminiApiKey;
          return headers;
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
