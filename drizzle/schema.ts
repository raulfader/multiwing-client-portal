import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

// ── Client Comments on Tracks ─────────────────────────────────────────────────
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  trackId: int("trackId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  timestampSeconds: int("timestampSeconds"), // playback position when comment was made
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// ── Client Approvals per Pillar ───────────────────────────────────────────────
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
