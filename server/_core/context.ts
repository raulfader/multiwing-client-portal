import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { SESSION_COOKIE, validateSession } from "../customAuth";
import { parse as parseCookies } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token =
      (opts.req.headers["x-session-token"] as string | undefined) ??
      parseCookies(opts.req.headers.cookie ?? "")[SESSION_COOKIE];
    if (token) {
      const session = await validateSession(token);
      if (session) {
        // Build a minimal User-shaped object from the custom session
        user = {
          id: 0,
          openId: session.role,
          name: session.role === "admin" ? "Admin" : "Client",
          email: session.role === "admin" ? (process.env.ADMIN_EMAIL ?? null) : null,
          role: session.role === "admin" ? "admin" : "user",
          loginMethod: null,
          lastSignedIn: null,
          createdAt: new Date(),
        } as unknown as User;
      }
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
