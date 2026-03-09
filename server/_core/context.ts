import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Gemini API key forwarded from the mobile client via `X-Gemini-API-Key` header. */
  userApiKey: string | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  const userApiKey = (opts.req.headers["x-gemini-api-key"] as string) || null;

  return {
    req: opts.req,
    res: opts.res,
    user,
    userApiKey,
  };
}
