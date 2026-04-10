import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { approvals, clientProjectRequests, comments, deliverableComments, deliverables, InsertUser, pillars, projects, trackApprovals, tracks, users } from "../drizzle/schema";
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
  if (!db) return null;
  const result = await db.select().from(pillars).where(eq(pillars.id, id)).limit(1);
  return result[0] ?? null;
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
  if (!db) return null;
  const result = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
  return result[0] ?? null;
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
  const result = await db
    .select({
      id: comments.id,
      trackId: comments.trackId,
      userId: comments.userId,
      commenterName: comments.commenterName,
      content: comments.content,
      timestampSeconds: comments.timestampSeconds,
      adminResponse: comments.adminResponse,
      resolvedAt: comments.resolvedAt,
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
      commenterName: comments.commenterName,
      content: comments.content,
      timestampSeconds: comments.timestampSeconds,
      adminResponse: comments.adminResponse,
      resolvedAt: comments.resolvedAt,
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
  commenterName?: string;
  content: string;
  timestampSeconds?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(comments).values({
    trackId: data.trackId,
    userId: data.userId,
    commenterName: data.commenterName ?? null,
    content: data.content,
    timestampSeconds: data.timestampSeconds ?? null,
  });
  return result;
}

export async function resolveComment(id: number, adminResponse?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(comments).set({
    resolvedAt: new Date(),
    adminResponse: adminResponse ?? null,
  }).where(eq(comments.id, id));
}

export async function respondToComment(id: number, adminResponse: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(comments).set({ adminResponse }).where(eq(comments.id, id));
}

export async function unresolveComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(comments).set({ resolvedAt: null }).where(eq(comments.id, id));
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export async function getApprovalByPillarAndUser(pillarId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.pillarId, pillarId), eq(approvals.userId, userId)))
    .limit(1);
  return result[0] ?? null;
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

// ── Projects ──────────────────────────────────────────────────────────────────────────────────
export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.isPublished, 1)).orderBy(asc(projects.sortOrder), asc(projects.createdAt));
}

export async function getAllProjectsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.createdAt));
}

export async function getProjectBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createProject(data: {
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  category?: string;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(projects).values({
    title: data.title,
    slug: data.slug,
    description: data.description ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
    category: data.category ?? null,
    sortOrder: data.sortOrder ?? 0,
    isPublished: 1,
  });
}

export async function updateProject(id: number, data: Partial<{
  title: string;
  description: string;
  coverImageUrl: string;
  category: string;
  sortOrder: number;
  isPublished: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projects).where(eq(projects.id, id));
}

export async function reorderProjects(items: { id: number; sortOrder: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      db.update(projects).set({ sortOrder }).where(eq(projects.id, id))
    )
  );
}

// ── Deliverables ──────────────────────────────────────────────────────────────

export async function getDeliverablesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliverables).where(eq(deliverables.projectId, projectId)).orderBy(asc(deliverables.sortOrder), asc(deliverables.createdAt));
}

export async function getDeliverableById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(deliverables).where(eq(deliverables.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createDeliverable(data: {
  projectId: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  fileType?: string;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(deliverables).values({
    projectId: data.projectId,
    title: data.title,
    description: data.description ?? null,
    thumbnailUrl: data.thumbnailUrl ?? null,
    downloadUrl: data.downloadUrl ?? null,
    fileType: data.fileType ?? "video",
    sortOrder: data.sortOrder ?? 0,
  });
}

export async function updateDeliverable(id: number, data: Partial<{
  title: string;
  description: string;
  thumbnailUrl: string;
  downloadUrl: string;
  fileType: string;
  sortOrder: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(deliverables).set(data).where(eq(deliverables.id, id));
}

export async function deleteDeliverable(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(deliverables).where(eq(deliverables.id, id));
}

// ── Deliverable Comments ──────────────────────────────────────────────────────

export async function getCommentsByDeliverable(deliverableId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: deliverableComments.id,
      deliverableId: deliverableComments.deliverableId,
      userId: deliverableComments.userId,
      commenterName: deliverableComments.commenterName,
      content: deliverableComments.content,
      adminResponse: deliverableComments.adminResponse,
      resolvedAt: deliverableComments.resolvedAt,
      createdAt: deliverableComments.createdAt,
      userName: users.name,
    })
    .from(deliverableComments)
    .leftJoin(users, eq(deliverableComments.userId, users.id))
    .where(eq(deliverableComments.deliverableId, deliverableId))
    .orderBy(asc(deliverableComments.createdAt));
}

export async function createDeliverableComment(data: {
  deliverableId: number;
  userId: number;
  commenterName?: string;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(deliverableComments).values({
    deliverableId: data.deliverableId,
    userId: data.userId,
    commenterName: data.commenterName ?? null,
    content: data.content,
  });
}

export async function resolveDeliverableComment(id: number, adminResponse?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(deliverableComments).set({
    resolvedAt: new Date(),
    adminResponse: adminResponse ?? null,
  }).where(eq(deliverableComments.id, id));
}

export async function respondToDeliverableComment(id: number, adminResponse: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(deliverableComments).set({ adminResponse }).where(eq(deliverableComments.id, id));
}

export async function unresolveDeliverableComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(deliverableComments).set({ resolvedAt: null }).where(eq(deliverableComments.id, id));
}

// ── Per-Track Approvals ──────────────────────────────────────────────────────

export async function getTrackApprovalByTrackAndUser(trackId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(trackApprovals)
    .where(and(eq(trackApprovals.trackId, trackId), eq(trackApprovals.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertTrackApproval(data: {
  trackId: number;
  userId: number;
  status: "approved" | "needs_changes" | "rejected" | "pending";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getTrackApprovalByTrackAndUser(data.trackId, data.userId);
  if (existing) {
    await db
      .update(trackApprovals)
      .set({ status: data.status })
      .where(eq(trackApprovals.id, existing.id));
  } else {
    await db.insert(trackApprovals).values({
      trackId: data.trackId,
      userId: data.userId,
      status: data.status,
    });
  }
}

export async function getTrackApprovalsByTrack(trackId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: trackApprovals.id,
      trackId: trackApprovals.trackId,
      userId: trackApprovals.userId,
      status: trackApprovals.status,
      updatedAt: trackApprovals.updatedAt,
      userName: users.name,
    })
    .from(trackApprovals)
    .leftJoin(users, eq(trackApprovals.userId, users.id))
    .where(eq(trackApprovals.trackId, trackId));
}

export async function getAllTrackApprovals() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: trackApprovals.id,
      trackId: trackApprovals.trackId,
      userId: trackApprovals.userId,
      status: trackApprovals.status,
      updatedAt: trackApprovals.updatedAt,
      userName: users.name,
      trackTitle: tracks.title,
    })
    .from(trackApprovals)
    .leftJoin(users, eq(trackApprovals.userId, users.id))
    .leftJoin(tracks, eq(trackApprovals.trackId, tracks.id))
    .orderBy(desc(trackApprovals.updatedAt));
}

export async function getAllDeliverableComments() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: deliverableComments.id,
      deliverableId: deliverableComments.deliverableId,
      userId: deliverableComments.userId,
      commenterName: deliverableComments.commenterName,
      content: deliverableComments.content,
      adminResponse: deliverableComments.adminResponse,
      resolvedAt: deliverableComments.resolvedAt,
      createdAt: deliverableComments.createdAt,
      userName: users.name,
    })
    .from(deliverableComments)
    .leftJoin(users, eq(deliverableComments.userId, users.id))
    .orderBy(desc(deliverableComments.createdAt));
}

// ── Client Project Requests ────────────────────────────────────────────────────

export async function createClientProjectRequest(data: {
  title: string;
  description?: string;
  submitterName: string;
  submitterEmail: string;
  submitterCompany?: string;
  files: string; // JSON string
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clientProjectRequests).values({
    title: data.title,
    description: data.description ?? null,
    submitterName: data.submitterName,
    submitterEmail: data.submitterEmail,
    submitterCompany: data.submitterCompany ?? null,
    files: data.files,
    status: "new",
  });
  return result;
}

export async function getAllClientProjectRequests() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(clientProjectRequests)
    .orderBy(desc(clientProjectRequests.createdAt));
  return rows.map((row) => ({
    ...row,
    files: typeof row.files === "string"
      ? (() => { try { return JSON.parse(row.files as string); } catch { return []; } })()
      : (Array.isArray(row.files) ? row.files : []),
  }));
}

export async function updateClientProjectRequestStatus(
  id: number,
  status: "new" | "in_review" | "completed",
  adminNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(clientProjectRequests)
    .set({ status, adminNotes: adminNotes ?? null })
    .where(eq(clientProjectRequests.id, id));
}
