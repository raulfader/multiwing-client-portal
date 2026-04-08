import { randomBytes } from "crypto";
import { getDb } from "./db";
import { customSessions } from "../drizzle/schema";
import { eq, lt } from "drizzle-orm";

const PORTAL_PASSWORD = process.env.PORTAL_PASSWORD ?? "MW@2025";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@faderlabs.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

const SESSION_TTL_DAYS = 30;

export function generateToken(): string {
  return randomBytes(48).toString("hex");
}

export async function createSession(role: "client" | "admin"): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(customSessions).values({ token, role, expiresAt });
  return token;
}

export async function validateSession(token: string): Promise<{ role: "client" | "admin" } | null> {
  if (!token) return null;
  const db = await getDb();
  if (!db) return null;
  const [session] = await db
    .select()
    .from(customSessions)
    .where(eq(customSessions.token, token))
    .limit(1);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.delete(customSessions).where(eq(customSessions.token, token));
    return null;
  }
  return { role: session.role };
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(customSessions).where(eq(customSessions.token, token));
}

export async function pruneExpiredSessions(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(customSessions).where(lt(customSessions.expiresAt, new Date()));
}

export function checkClientPassword(password: string): boolean {
  return password === PORTAL_PASSWORD;
}

export function checkAdminCredentials(email: string, password: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;
}

export const SESSION_COOKIE = "portal_session";
