import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { SESSION_COOKIE, validateSession } from "../customAuth";
import { parse as parseCookies } from "cookie";
import { getDb } from "../db";
import { shareSessions, projectShares } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  shareId?: number; // set when authenticated via a share session token
};

async function validateShareSession(
  token: string
): Promise<{ shareId: number; projectId: number } | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const now = new Date();
    const rows = await db
      .select({
        id: shareSessions.id,
        shareId: shareSessions.shareId,
        expiresAt: shareSessions.expiresAt,
      })
      .from(shareSessions)
      .where(and(eq(shareSessions.sessionToken, token), gt(shareSessions.expiresAt, now)))
      .limit(1);
    if (!rows[0]) return null;
    const shareRows = await db
      .select({ projectId: projectShares.projectId })
      .from(projectShares)
      .where(eq(projectShares.id, rows[0].shareId))
      .limit(1);
    if (!shareRows[0]) return null;
    return { shareId: rows[0].shareId, projectId: shareRows[0].projectId };
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let shareId: number | undefined;

  try {
    const token =
      (opts.req.headers["x-session-token"] as string | undefined) ??
      parseCookies(opts.req.headers.cookie ?? "")[SESSION_COOKIE];

    if (token) {
      // First try normal portal session
      const session = await validateSession(token);
      if (session) {
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
      } else {
        // Fall back to share session token
        const shareSession = await validateShareSession(token);
        if (shareSession) {
          shareId = shareSession.shareId;
          user = {
            id: 0,
            openId: "guest",
            name: "Guest",
            email: null,
            role: "user",
            loginMethod: null,
            lastSignedIn: null,
            createdAt: new Date(),
          } as unknown as User;
        }
      }
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    shareId,
  };
}
