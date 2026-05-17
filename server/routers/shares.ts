import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { projectShares, shareOtps, shareSessions, projects, deliverables } from "../../drizzle/schema";
import { eq, and, isNull, or, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendShareOtpEmail } from "../email";

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getActiveShare(token: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const now = new Date();
  const rows = await db
    .select()
    .from(projectShares)
    .where(
      and(
        eq(projectShares.token, token),
        eq(projectShares.isRevoked, 0),
        or(isNull(projectShares.expiresAt), gt(projectShares.expiresAt, now))
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function getShareSession(sessionToken: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const now = new Date();
  const rows = await db
    .select()
    .from(shareSessions)
    .where(and(eq(shareSessions.sessionToken, sessionToken), gt(shareSessions.expiresAt, now)))
    .limit(1);
  return rows[0] ?? null;
}

// ── Router ────────────────────────────────────────────────────────────────────
export const sharesRouter = router({
  // Client: create a share for a project
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        email: z.string().email(),
        accessLevel: z.enum(["read", "download"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify project exists
      const projectRows = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      if (!projectRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      // Check if a non-revoked share already exists for this email+project
      const existing = await db
        .select()
        .from(projectShares)
        .where(
          and(
            eq(projectShares.projectId, input.projectId),
            eq(projectShares.email, input.email.toLowerCase()),
            eq(projectShares.isRevoked, 0)
          )
        )
        .limit(1);

      let share = existing[0];
      if (!share) {
        const token = nanoid(32);
        const inserted = await db.insert(projectShares).values({
          projectId: input.projectId,
          grantedByUserId: ctx.user.id,
          email: input.email.toLowerCase(),
          accessLevel: input.accessLevel,
          token,
          isRevoked: 0,
        });
        const newRows = await db
          .select()
          .from(projectShares)
          .where(eq(projectShares.token, token))
          .limit(1);
        share = newRows[0]!;
      } else {
        // Update access level if changed
        await db
          .update(projectShares)
          .set({ accessLevel: input.accessLevel })
          .where(eq(projectShares.id, share.id));
        share = { ...share, accessLevel: input.accessLevel };
      }

      // Send OTP email
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      await db.insert(shareOtps).values({
        shareId: share.id,
        code,
        expiresAt,
      });

      const shareUrl = `${input.origin}/share/${share.token}`;
      await sendShareOtpEmail({
        to: input.email,
        projectTitle: projectRows[0].title,
        code,
        accessLevel: input.accessLevel,
        shareUrl,
      });

      return {
        success: true,
        shareToken: share.token,
        shareUrl,
      };
    }),

  // Client: list shares for a project
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select()
        .from(projectShares)
        .where(and(eq(projectShares.projectId, input.projectId), eq(projectShares.isRevoked, 0)))
        .orderBy(projectShares.createdAt);
    }),

  // Client: revoke a share
  revoke: protectedProcedure
    .input(z.object({ shareId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .update(projectShares)
        .set({ isRevoked: 1 })
        .where(eq(projectShares.id, input.shareId));
      return { success: true };
    }),

  // Guest: request OTP for a share token (resend / initial request)
  requestOtp: publicProcedure
    .input(z.object({ token: z.string(), email: z.string().email(), origin: z.string().url() }))
    .mutation(async ({ input }) => {
      const share = await getActiveShare(input.token);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found or expired" });

      if (share.email !== input.email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Email does not match the share invitation" });
      }

      // Get project title
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const projectRows = await db
        .select()
        .from(projects)
        .where(eq(projects.id, share.projectId))
        .limit(1);

      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.insert(shareOtps).values({ shareId: share.id, code, expiresAt });

      const shareUrl = `${input.origin}/share/${share.token}`;
      await sendShareOtpEmail({
        to: share.email,
        projectTitle: projectRows[0]?.title ?? "your project",
        code,
        accessLevel: share.accessLevel,
        shareUrl,
      });

      return { success: true };
    }),

  // Guest: verify OTP and get a session token
  verifyOtp: publicProcedure
    .input(z.object({ token: z.string(), email: z.string().email(), code: z.string() }))
    .mutation(async ({ input }) => {
      const share = await getActiveShare(input.token);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found or expired" });

      if (share.email !== input.email.toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Email does not match the share invitation" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const now = new Date();
      const otpRows = await db
        .select()
        .from(shareOtps)
        .where(
          and(
            eq(shareOtps.shareId, share.id),
            eq(shareOtps.code, input.code.trim()),
            gt(shareOtps.expiresAt, now),
            isNull(shareOtps.usedAt)
          )
        )
        .orderBy(shareOtps.createdAt)
        .limit(1);

      if (!otpRows[0]) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired verification code" });
      }

      // Mark OTP as used
      await db.update(shareOtps).set({ usedAt: now }).where(eq(shareOtps.id, otpRows[0].id));

      // Create a share session (24 hours)
      const sessionToken = nanoid(48);
      const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.insert(shareSessions).values({
        shareId: share.id,
        sessionToken,
        expiresAt: sessionExpiry,
      });

      return { success: true, sessionToken, accessLevel: share.accessLevel };
    }),

  // Guest: get project data using a share session token
  getProject: publicProcedure
    .input(z.object({ shareToken: z.string(), sessionToken: z.string() }))
    .query(async ({ input }) => {
      const share = await getActiveShare(input.shareToken);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found or expired" });

      const session = await getShareSession(input.sessionToken);
      if (!session || session.shareId !== share.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired. Please verify your email again." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const projectRows = await db
        .select()
        .from(projects)
        .where(eq(projects.id, share.projectId))
        .limit(1);

      if (!projectRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const deliverableRows = await db
        .select()
        .from(deliverables)
        .where(eq(deliverables.projectId, share.projectId))
        .orderBy(deliverables.sortOrder);

      return {
        project: projectRows[0],
        deliverables: deliverableRows,
        accessLevel: share.accessLevel,
        guestEmail: share.email,
      };
    }),

  // Guest: check if a share token is valid (for the landing page)
  checkToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const share = await getActiveShare(input.token);
      if (!share) return { valid: false };

      const db = await getDb();
      if (!db) return { valid: false };
      const projectRows = await db
        .select({ title: projects.title, category: projects.category })
        .from(projects)
        .where(eq(projects.id, share.projectId))
        .limit(1);

      return {
        valid: true,
        projectTitle: projectRows[0]?.title ?? "Project",
        projectCategory: projectRows[0]?.category ?? "video",
        accessLevel: share.accessLevel,
        guestEmail: share.email,
      };
    }),
});
