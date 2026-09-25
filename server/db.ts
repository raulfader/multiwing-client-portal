import { and, asc, count, desc, eq, gte, isNotNull, isNull, like, max, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { activityLog, approvals, clientProjectRequests, comments, deliverableComments, deliverables, InsertActivityLogEntry, InsertUser, pillars, projectContacts, projectShares, projects, siteSettings, trackApprovals, tracks, users } from "../drizzle/schema";
import { ENV } from './_core/env';

/** Extracts the auto-increment id from a mysql2 insert result (`[ResultSetHeader, fields]`). */
export function insertIdOf(result: unknown): number | null {
  const header = Array.isArray(result) ? result[0] : result;
  const id = (header as { insertId?: unknown } | null | undefined)?.insertId;
  return typeof id === "number" && id > 0 ? id : null;
}

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
  // Resolving without a response keeps any reply the team already posted.
  await db.update(comments).set({
    resolvedAt: new Date(),
    ...(adminResponse !== undefined ? { adminResponse } : {}),
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
  projectStatus: string;
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
  fileKey: string | null;
  fileName: string | null;
  fileSize: number | null;
  sortOrder: number;
  reviewStatus: string;
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
      timestampSeconds: deliverableComments.timestampSeconds,
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
  timestampSeconds?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(deliverableComments).values({
    deliverableId: data.deliverableId,
    userId: data.userId,
    commenterName: data.commenterName ?? null,
    content: data.content,
    timestampSeconds: data.timestampSeconds ?? null,
  });
}

export async function resolveDeliverableComment(id: number, adminResponse?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(deliverableComments).set({
    resolvedAt: new Date(),
    ...(adminResponse !== undefined ? { adminResponse } : {}),
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
      timestampSeconds: deliverableComments.timestampSeconds,
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

export async function deleteClientProjectRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(clientProjectRequests).where(eq(clientProjectRequests.id, id));
}

// ── Site Settings ─────────────────────────────────────────────────────────────

export async function getSiteSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSiteSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

export async function getSiteSettings(keys: string[]): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(siteSettings);
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (keys.includes(row.key) && row.value != null) {
      map[row.key] = row.value;
    }
  }
  return map;
}

// ── Activity Log ──────────────────────────────────────────────────────────────

export async function insertActivityLog(entry: Omit<InsertActivityLogEntry, "id" | "createdAt">): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[ActivityLog] DB unavailable, skipping log"); return; }
  await db.insert(activityLog).values(entry);
}

/** Returns all activity_log rows created after `since` (UTC Date). */
export async function getActivityLogSince(since: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLog)
    .where(gte(activityLog.createdAt, since))
    .orderBy(asc(activityLog.createdAt));
}

/** Returns the guest email for a given shareId (from project_shares). */
export async function getGuestEmailByShareId(shareId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ email: projectShares.email })
    .from(projectShares)
    .where(eq(projectShares.id, shareId))
    .limit(1);
  return rows[0]?.email ?? null;
}

/**
 * Returns total download count per deliverable ID.
 * Result is a map: { [deliverableId]: count }
 */
export async function getDownloadCountsByDeliverables(deliverableIds: number[]): Promise<Record<number, number>> {
  if (deliverableIds.length === 0) return {};
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({ deliverableId: activityLog.deliverableId, total: count() })
    .from(activityLog)
    .where(eq(activityLog.eventType, "download"))
    .groupBy(activityLog.deliverableId);
  const map: Record<number, number> = {};
  for (const row of rows) {
    if (row.deliverableId != null && deliverableIds.includes(row.deliverableId)) {
      map[row.deliverableId] = Number(row.total);
    }
  }
  return map;
}

// ── Operations (cross-project read views for the admin / MCP tooling) ─────────

export type CommentInboxFilter = {
  /** open = unresolved, unanswered = unresolved with no team reply */
  status?: "open" | "unanswered" | "resolved" | "all";
  source?: "deliverables" | "tracks" | "all";
  /** Deliverable comments only — sonic-branding track comments are not tied to a project row. */
  projectId?: number;
  since?: Date;
  limit?: number;
};

export type CommentInboxEntry = {
  kind: "deliverable" | "track";
  id: number;
  commenterName: string | null;
  content: string;
  timestampSeconds: number | null;
  adminResponse: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  deliverableId: number | null;
  deliverableTitle: string | null;
  reviewStatus: string | null;
  projectId: number | null;
  projectTitle: string | null;
  projectSlug: string | null;
  trackId: number | null;
  trackTitle: string | null;
  pillarId: number | null;
  pillarTitle: string | null;
};

function commentStatusCondition(
  table: typeof comments | typeof deliverableComments,
  status: NonNullable<CommentInboxFilter["status"]>
) {
  switch (status) {
    case "open":
      return isNull(table.resolvedAt);
    case "unanswered":
      return and(isNull(table.resolvedAt), isNull(table.adminResponse));
    case "resolved":
      return isNotNull(table.resolvedAt);
    default:
      return undefined;
  }
}

/** Unified review-comment feed across deliverables and sonic-branding tracks, newest first. */
export async function getCommentInbox(filter: CommentInboxFilter = {}): Promise<CommentInboxEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const status = filter.status ?? "open";
  const source = filter.source ?? "all";
  const limit = filter.limit ?? 100;

  const deliverableRows =
    source === "tracks"
      ? []
      : await db
          .select({
            id: deliverableComments.id,
            commenterName: deliverableComments.commenterName,
            content: deliverableComments.content,
            timestampSeconds: deliverableComments.timestampSeconds,
            adminResponse: deliverableComments.adminResponse,
            resolvedAt: deliverableComments.resolvedAt,
            createdAt: deliverableComments.createdAt,
            deliverableId: deliverableComments.deliverableId,
            deliverableTitle: deliverables.title,
            reviewStatus: deliverables.reviewStatus,
            projectId: deliverables.projectId,
            projectTitle: projects.title,
            projectSlug: projects.slug,
          })
          .from(deliverableComments)
          .leftJoin(deliverables, eq(deliverableComments.deliverableId, deliverables.id))
          .leftJoin(projects, eq(deliverables.projectId, projects.id))
          .where(
            and(
              commentStatusCondition(deliverableComments, status),
              filter.projectId != null ? eq(deliverables.projectId, filter.projectId) : undefined,
              filter.since ? gte(deliverableComments.createdAt, filter.since) : undefined
            )
          )
          .orderBy(desc(deliverableComments.createdAt))
          .limit(limit);

  const trackRows =
    source === "deliverables" || filter.projectId != null
      ? []
      : await db
          .select({
            id: comments.id,
            commenterName: comments.commenterName,
            content: comments.content,
            timestampSeconds: comments.timestampSeconds,
            adminResponse: comments.adminResponse,
            resolvedAt: comments.resolvedAt,
            createdAt: comments.createdAt,
            trackId: comments.trackId,
            trackTitle: tracks.title,
            pillarId: tracks.pillarId,
            pillarTitle: pillars.title,
          })
          .from(comments)
          .leftJoin(tracks, eq(comments.trackId, tracks.id))
          .leftJoin(pillars, eq(tracks.pillarId, pillars.id))
          .where(
            and(
              commentStatusCondition(comments, status),
              filter.since ? gte(comments.createdAt, filter.since) : undefined
            )
          )
          .orderBy(desc(comments.createdAt))
          .limit(limit);

  const empty = {
    deliverableId: null, deliverableTitle: null, reviewStatus: null,
    projectId: null, projectTitle: null, projectSlug: null,
    trackId: null, trackTitle: null, pillarId: null, pillarTitle: null,
  };
  const merged: CommentInboxEntry[] = [
    ...deliverableRows.map((r) => ({ ...empty, ...r, kind: "deliverable" as const })),
    ...trackRows.map((r) => ({ ...empty, ...r, kind: "track" as const })),
  ];
  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return merged.slice(0, limit);
}

export type ProjectReviewSummary = {
  projectId: number;
  title: string;
  slug: string;
  projectStatus: string;
  isPublished: boolean;
  deliverables: { total: number; pending: number; approved: number; needsChanges: number };
  comments: { total: number; open: number; lastCommentAt: Date | null };
  /** Every deliverable approved, no open comments, and the project is not yet marked completed. */
  readyToComplete: boolean;
};

/** Per-project roll-up of deliverable review status and open client comments. */
export async function getReviewSummary(projectId?: number): Promise<ProjectReviewSummary[]> {
  const db = await getDb();
  if (!db) return [];
  const projectFilter = projectId != null ? eq(projects.id, projectId) : undefined;
  const deliverableFilter = projectId != null ? eq(deliverables.projectId, projectId) : undefined;

  const projectRows = await db
    .select()
    .from(projects)
    .where(projectFilter)
    .orderBy(asc(projects.sortOrder), asc(projects.createdAt));

  const statusRows = await db
    .select({ projectId: deliverables.projectId, reviewStatus: deliverables.reviewStatus, total: count() })
    .from(deliverables)
    .where(deliverableFilter)
    .groupBy(deliverables.projectId, deliverables.reviewStatus);

  const commentRows = await db
    .select({
      projectId: deliverables.projectId,
      total: count(),
      open: sql<string>`sum(case when ${deliverableComments.resolvedAt} is null then 1 else 0 end)`,
      lastCommentAt: max(deliverableComments.createdAt),
    })
    .from(deliverableComments)
    .innerJoin(deliverables, eq(deliverableComments.deliverableId, deliverables.id))
    .where(deliverableFilter)
    .groupBy(deliverables.projectId);

  return projectRows.map((p) => {
    const counts = { total: 0, pending: 0, approved: 0, needsChanges: 0 };
    for (const row of statusRows) {
      if (row.projectId !== p.id) continue;
      const n = Number(row.total);
      counts.total += n;
      if (row.reviewStatus === "approved") counts.approved += n;
      else if (row.reviewStatus === "needs_changes") counts.needsChanges += n;
      else counts.pending += n;
    }
    const c = commentRows.find((row) => row.projectId === p.id);
    const commentCounts = {
      total: c ? Number(c.total) : 0,
      open: c ? Number(c.open ?? 0) : 0,
      lastCommentAt: c?.lastCommentAt ?? null,
    };
    return {
      projectId: p.id,
      title: p.title,
      slug: p.slug,
      projectStatus: p.projectStatus,
      isPublished: p.isPublished === 1,
      deliverables: counts,
      comments: commentCounts,
      readyToComplete:
        counts.total > 0 &&
        counts.approved === counts.total &&
        commentCounts.open === 0 &&
        p.projectStatus !== "completed",
    };
  });
}

export async function getActivityLog(filter: {
  since?: Date;
  eventType?: "comment" | "download";
  deliverableId?: number;
  limit?: number;
} = {}) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLog)
    .where(
      and(
        filter.since ? gte(activityLog.createdAt, filter.since) : undefined,
        filter.eventType ? eq(activityLog.eventType, filter.eventType) : undefined,
        filter.deliverableId != null ? eq(activityLog.deliverableId, filter.deliverableId) : undefined
      )
    )
    .orderBy(desc(activityLog.createdAt))
    .limit(filter.limit ?? 100);
}

function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/** Case-insensitive substring search across the main content-hub tables. */
export async function searchHub(query: string, limit = 20) {
  const db = await getDb();
  const empty = { projects: [], deliverables: [], comments: [], tracks: [], contacts: [], clientRequests: [] };
  if (!db) return empty;
  const q = likePattern(query.trim());

  const [projectHits, deliverableHits, commentHits, trackHits, contactHits, requestHits] = await Promise.all([
    db
      .select({ id: projects.id, title: projects.title, slug: projects.slug, projectStatus: projects.projectStatus, category: projects.category })
      .from(projects)
      .where(or(like(projects.title, q), like(projects.slug, q), like(projects.description, q), like(projects.category, q)))
      .limit(limit),
    db
      .select({
        id: deliverables.id,
        title: deliverables.title,
        fileName: deliverables.fileName,
        reviewStatus: deliverables.reviewStatus,
        projectId: deliverables.projectId,
        projectTitle: projects.title,
      })
      .from(deliverables)
      .leftJoin(projects, eq(deliverables.projectId, projects.id))
      .where(or(like(deliverables.title, q), like(deliverables.description, q), like(deliverables.fileName, q)))
      .limit(limit),
    db
      .select({
        id: deliverableComments.id,
        deliverableId: deliverableComments.deliverableId,
        deliverableTitle: deliverables.title,
        commenterName: deliverableComments.commenterName,
        content: deliverableComments.content,
        resolvedAt: deliverableComments.resolvedAt,
        createdAt: deliverableComments.createdAt,
      })
      .from(deliverableComments)
      .leftJoin(deliverables, eq(deliverableComments.deliverableId, deliverables.id))
      .where(or(like(deliverableComments.content, q), like(deliverableComments.commenterName, q), like(deliverableComments.adminResponse, q)))
      .orderBy(desc(deliverableComments.createdAt))
      .limit(limit),
    db
      .select({ id: tracks.id, title: tracks.title, pillarId: tracks.pillarId, pillarTitle: pillars.title })
      .from(tracks)
      .leftJoin(pillars, eq(tracks.pillarId, pillars.id))
      .where(or(like(tracks.title, q), like(tracks.description, q)))
      .limit(limit),
    db
      .select({
        id: projectContacts.id,
        projectId: projectContacts.projectId,
        firstName: projectContacts.firstName,
        lastName: projectContacts.lastName,
        email: projectContacts.email,
      })
      .from(projectContacts)
      .where(or(like(projectContacts.firstName, q), like(projectContacts.lastName, q), like(projectContacts.email, q)))
      .limit(limit),
    db
      .select({
        id: clientProjectRequests.id,
        title: clientProjectRequests.title,
        submitterName: clientProjectRequests.submitterName,
        submitterEmail: clientProjectRequests.submitterEmail,
        status: clientProjectRequests.status,
        createdAt: clientProjectRequests.createdAt,
      })
      .from(clientProjectRequests)
      .where(
        or(
          like(clientProjectRequests.title, q),
          like(clientProjectRequests.description, q),
          like(clientProjectRequests.submitterName, q),
          like(clientProjectRequests.submitterEmail, q),
          like(clientProjectRequests.submitterCompany, q)
        )
      )
      .orderBy(desc(clientProjectRequests.createdAt))
      .limit(limit),
  ]);

  return {
    projects: projectHits,
    deliverables: deliverableHits,
    comments: commentHits,
    tracks: trackHits,
    contacts: contactHits,
    clientRequests: requestHits,
  };
}
