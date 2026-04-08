import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { approvals, comments, InsertUser, pillars, tracks, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Pillars ───────────────────────────────────────────────────────────────────

export async function getAllPillars() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pillars).orderBy(asc(pillars.sortOrder), asc(pillars.createdAt));
}

export async function getPillarById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pillars).where(eq(pillars.id, id)).limit(1);
  return result[0];
}

export async function createPillar(data: { title: string; description?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pillars).values({
    title: data.title,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  return result;
}

export async function updatePillar(id: number, data: { title?: string; description?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pillars).set(data).where(eq(pillars.id, id));
}

export async function deletePillar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pillars).where(eq(pillars.id, id));
}

// ── Tracks ────────────────────────────────────────────────────────────────────

export async function getTracksByPillar(pillarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tracks).where(eq(tracks.pillarId, pillarId)).orderBy(asc(tracks.sortOrder), asc(tracks.createdAt));
}

export async function getTrackById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
  return result[0];
}

export async function countTracksByPillar(pillarId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(tracks).where(eq(tracks.pillarId, pillarId));
  return result.length;
}

export async function createTrack(data: {
  pillarId: number;
  title: string;
  description?: string;
  audioUrl: string;
  audioKey: string;
  durationSeconds?: number;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tracks).values({
    pillarId: data.pillarId,
    title: data.title,
    description: data.description ?? null,
    audioUrl: data.audioUrl,
    audioKey: data.audioKey,
    durationSeconds: data.durationSeconds ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  return result;
}

export async function deleteTrack(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(tracks).where(eq(tracks.id, id));
}

export async function getAllTracksWithPillars() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tracks).orderBy(asc(tracks.pillarId), asc(tracks.sortOrder));
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function getCommentsByTrack(trackId: number) {
  const db = await getDb();
  if (!db) return [];
  // Join with users to get commenter name
  const result = await db
    .select({
      id: comments.id,
      trackId: comments.trackId,
      userId: comments.userId,
      content: comments.content,
      timestampSeconds: comments.timestampSeconds,
      createdAt: comments.createdAt,
      userName: users.name,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.trackId, trackId))
    .orderBy(asc(comments.createdAt));
  return result;
}

export async function getAllComments() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: comments.id,
      trackId: comments.trackId,
      userId: comments.userId,
      content: comments.content,
      timestampSeconds: comments.timestampSeconds,
      createdAt: comments.createdAt,
      userName: users.name,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .orderBy(desc(comments.createdAt));
}

export async function createComment(data: {
  trackId: number;
  userId: number;
  content: string;
  timestampSeconds?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(comments).values({
    trackId: data.trackId,
    userId: data.userId,
    content: data.content,
    timestampSeconds: data.timestampSeconds ?? null,
  });
  return result;
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export async function getApprovalByPillarAndUser(pillarId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.pillarId, pillarId), eq(approvals.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getAllApprovals() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: approvals.id,
      pillarId: approvals.pillarId,
      userId: approvals.userId,
      status: approvals.status,
      note: approvals.note,
      updatedAt: approvals.updatedAt,
      createdAt: approvals.createdAt,
      userName: users.name,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.userId, users.id))
    .orderBy(desc(approvals.updatedAt));
}

export async function upsertApproval(data: {
  pillarId: number;
  userId: number;
  status: "approved" | "rejected" | "pending";
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getApprovalByPillarAndUser(data.pillarId, data.userId);
  if (existing) {
    await db
      .update(approvals)
      .set({ status: data.status, note: data.note ?? null })
      .where(eq(approvals.id, existing.id));
  } else {
    await db.insert(approvals).values({
      pillarId: data.pillarId,
      userId: data.userId,
      status: data.status,
      note: data.note ?? null,
    });
  }
}

export async function getApprovalsByPillar(pillarId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: approvals.id,
      pillarId: approvals.pillarId,
      userId: approvals.userId,
      status: approvals.status,
      note: approvals.note,
      updatedAt: approvals.updatedAt,
      userName: users.name,
    })
    .from(approvals)
    .leftJoin(users, eq(approvals.userId, users.id))
    .where(eq(approvals.pillarId, pillarId));
}
