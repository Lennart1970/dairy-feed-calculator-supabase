import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./sdk";

// Simple user type for context
export type ContextUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: string;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: ContextUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: ContextUser | null = null;

  try {
    // Get the session cookie
    const sessionCookie = opts.req.cookies?.[COOKIE_NAME];
    
    if (sessionCookie) {
      // Verify the session using our SDK
      const session = await sdk.verifySession(sessionCookie);
      
      if (session) {
        // Create a simple user object from the session
        user = {
          id: 1, // We don't have a real ID in simple auth
          openId: session.openId,
          name: session.name,
          email: null,
          role: 'user',
        };
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.warn("[Context] Auth check failed:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
