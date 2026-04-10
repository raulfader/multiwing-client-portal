import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Sonic Branding Pillars ────────────────────────────────────────────────────
export const pillars = mysqlTable("pillars", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pillar = typeof pillars.$inferSelect;
export type InsertPillar = typeof pillars.$inferInsert;

// ── Audio Tracks (max 2 per pillar) ──────────────────────────────────────────
export const tracks = mysqlTable("tracks", {
  id: int("id").autoincrement().primaryKey(),
  pillarId: int("pillarId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  audioUrl: text("audioUrl").notNull(),
  audioKey: varchar("audioKey", { length: 512 }).notNull(),
  durationSeconds: int("durationSeconds"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Track = typeof tracks.$inferSelect;
export type InsertTrack = typeof tracks.$inferInsert;

// ── Client Comments on Tracks ─────────────────────────────────────────────────────
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  trackId: int("trackId").notNull(),
  userId: int("userId").notNull(),
  commenterName: varchar("commenterName", { length: 100 }),
  content: text("content").notNull(),
  timestampSeconds: int("timestampSeconds"),
  adminResponse: text("adminResponse"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// ── Client Approvals per Pillar (legacy, kept for migration compat) ──────────
export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  pillarId: int("pillarId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["approved", "rejected", "pending"]).default("pending").notNull(),
  note: text("note"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = typeof approvals.$inferInsert;

// ── Per-Track Approvals (approve / needs_changes / reject) ────────────────────
export const trackApprovals = mysqlTable("track_approvals", {
  id: int("id").autoincrement().primaryKey(),
  trackId: int("trackId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["approved", "needs_changes", "rejected", "pending"]).default("pending").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrackApproval = typeof trackApprovals.$inferSelect;
export type InsertTrackApproval = typeof trackApprovals.$inferInsert;

// ── Content Hub Projects ──────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  coverImageUrl: text("coverImageUrl"),
  category: varchar("category", { length: 100 }), // e.g. "video", "archive", "brand"
  sortOrder: int("sortOrder").default(0).notNull(),
  isPublished: int("isPublished").default(1).notNull(), // 1=visible, 0=hidden
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ── Project Deliverables (video/file links per project) ───────────────────────
export const deliverables = mysqlTable("deliverables", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  downloadUrl: text("downloadUrl"), // f.io or OneDrive link (legacy) or S3 public URL
  fileType: varchar("fileType", { length: 50 }).default("video"), // video, audio, document, archive
  fileKey: text("fileKey"), // S3 object key for uploaded files
  fileName: varchar("fileName", { length: 500 }), // original filename
   fileSize: bigint("fileSize", { mode: "number" }), // bytes
  sortOrder: int("sortOrder").default(0).notNull(),
  reviewStatus: varchar("reviewStatus", { length: 50 }).default("pending").notNull(), // pending, approved, needs_changes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Deliverable = typeof deliverables.$inferSelect;
export type InsertDeliverable = typeof deliverables.$inferInsert;

// ── Client Comments on Deliverabless ────────────────────────────────────────────
export const deliverableComments = mysqlTable("deliverable_comments", {
  id: int("id").autoincrement().primaryKey(),
  deliverableId: int("deliverableId").notNull(),
  userId: int("userId").notNull(),
  commenterName: varchar("commenterName", { length: 100 }),
  content: text("content").notNull(),
  timestampSeconds: int("timestampSeconds"),
  adminResponse: text("adminResponse"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DeliverableComment = typeof deliverableComments.$inferSelect;
export type InsertDeliverableComment = typeof deliverableComments.$inferInsert;

// ── Project Contacts (email recipients per project) ──────────────────────────
export const projectContacts = mysqlTable("project_contacts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  email: varchar("email", { length: 320 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectContact = typeof projectContacts.$inferSelect;
export type InsertProjectContact = typeof projectContacts.$inferInsert;

// ── Email Log (sent notification history) ───────────────────────────────────
export const emailLog = mysqlTable("email_log", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  contactId: int("contactId").notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed"]).default("sent").notNull(),
  errorMessage: text("errorMessage"),
  trackingToken: varchar("trackingToken", { length: 128 }),
  openCount: int("openCount").default(0).notNull(),
  clickCount: int("clickCount").default(0).notNull(),
  firstOpenedAt: timestamp("firstOpenedAt"),
  lastOpenedAt: timestamp("lastOpenedAt"),
  firstClickedAt: timestamp("firstClickedAt"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type EmailLog = typeof emailLog.$inferSelect;
export type InsertEmailLog = typeof emailLog.$inferInsert;

// ── Email Events (per-open / per-click events) ────────────────────────────────
export const emailEvents = mysqlTable("email_events", {
  id: int("id").autoincrement().primaryKey(),
  emailLogId: int("emailLogId").notNull(),
  eventType: mysqlEnum("eventType", ["open", "click"]).notNull(),
  url: text("url"),           // populated for click events
  userAgent: text("userAgent"),
  ip: varchar("ip", { length: 64 }),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});

export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;

// ── Client Project Requests ─────────────────────────────────────────────────
export const clientProjectRequests = mysqlTable("client_project_requests", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  submitterName: varchar("submitterName", { length: 200 }).notNull(),
  submitterEmail: varchar("submitterEmail", { length: 320 }).notNull(),
  submitterCompany: varchar("submitterCompany", { length: 200 }),
  // JSON array of { name, url, key, size, type }
  files: text("files").default("[]").notNull(),
  status: mysqlEnum("status", ["new", "in_review", "completed"]).default("new").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientProjectRequest = typeof clientProjectRequests.$inferSelect;
export type InsertClientProjectRequest = typeof clientProjectRequests.$inferInsert;

// ── Custom Auth Sessions ───────────────────────────────────────────────
export const customSessions = mysqlTable("custom_sessions", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  role: mysqlEnum("role", ["client", "admin"]).default("client").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type CustomSession = typeof customSessions.$inferSelect;
export type InsertCustomSession = typeof customSessions.$inferInsert;
