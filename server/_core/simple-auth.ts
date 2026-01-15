import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { authenticateUser } from "../db-supabase";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerSimpleAuthRoutes(app: Express) {
  // Login endpoint - authenticates against Supabase database
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    try {
      // Authenticate against Supabase database
      const user = await authenticateUser(username, password);
      
      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Create a simple openId from username
      const openId = `simple_auth_${username}`;

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: user.name || username,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: { name: user.name, email: user.email } });
    } catch (error) {
      console.error("[SimpleAuth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });

  // Check auth status endpoint
  app.get("/api/auth/status", (req: Request, res: Response) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });
}
