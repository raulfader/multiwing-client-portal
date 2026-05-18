import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createComment,
  createPillar,
  createTrack,
  countTracksByPillar,
  deletePillar,
  deleteTrack,
  getAllApprovals,
  getAllComments,
  getAllPillars,
  getAllTracksWithPillars,
  getApprovalByPillarAndUser,
  getApprovalsByPillar,
  getCommentsByTrack,
  getPillarById,
  getTrackById,
  getTracksByPillar,
  updatePillar,
  upsertApproval,
  getTrackApprovalByTrackAndUser,
  upsertTrackApproval,
  getTrackApprovalsByTrack,
  getAllTrackApprovals,
  // Projects & Deliverables
  getAllProjects,
  getAllProjectsAdmin,
  getProjectBySlug,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
  getDeliverablesByProject,
  getDeliverableById,
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  getCommentsByDeliverable,
  createDeliverableComment,
  getAllDeliverableComments,
  resolveComment,
  respondToComment,
  unresolveComment,
  resolveDeliverableComment,
  respondToDeliverableComment,
  unresolveDeliverableComment,
  createClientProjectRequest,
  getAllClientProjectRequests,
  updateClientProjectRequestStatus,
  deleteClientProjectRequest,
  getSiteSettings,
  setSiteSetting,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { sendProjectNotification } from "./email";
import { getDb } from "./db";
import { projectContacts, emailLog, projectShares, projects, deliverables } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookies } from "cookie";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sharesRouter } from "./routers/shares";
import { nanoid } from "nanoid";
import {
  checkClientPassword,
  checkAdminCredentials,
  createSession,
  deleteSession,
  validateSession,
  SESSION_COOKIE,
} from "./customAuth";
import { shareSessions } from "../drizzle/schema";
import { gt as drizzleGt } from "drizzle-orm";

// adminProcedure is imported from ./_core/trpc — checks ctx.user?.role === 'admin' directly

export const appRouter = router({
  system: systemRouter,
  shares: sharesRouter,

  auth: router({
    // Returns current session info — reads token from x-session-token header or cookie
    me: publicProcedure.query(async ({ ctx }) => {
      const token =
        (ctx.req.headers["x-session-token"] as string | undefined) ??
        parseCookies(ctx.req.headers.cookie ?? "")[SESSION_COOKIE];
      if (!token) return null;
      // Check normal portal session first
      const session = await validateSession(token);
      if (session) return { role: session.role, isGuest: false };
      // Fall back to share session token — guests get role "user"
      try {
        const db = await getDb();
        if (db) {
          const now = new Date();
          const rows = await db
            .select({ id: shareSessions.id })
            .from(shareSessions)
            .where(and(eq(shareSessions.sessionToken, token), drizzleGt(shareSessions.expiresAt, now)))
            .limit(1);
          if (rows[0]) return { role: "user" as const, isGuest: true };
        }
      } catch { /* ignore */ }
      return null;
    }),

    // Client login: portal password only — returns token in body for localStorage storage
    clientLogin: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input }) => {
        if (!checkClientPassword(input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password" });
        }
        const token = await createSession("client");
        return { success: true, role: "client" as const, token };
      }),

    // Admin login: email + password — returns token in body for localStorage storage
    adminLogin: publicProcedure
      .input(z.object({ email: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        if (!checkAdminCredentials(input.email, input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin credentials" });
        }
        const token = await createSession("admin");
        return { success: true, role: "admin" as const, token };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token =
        (ctx.req.headers["x-session-token"] as string | undefined) ??
        parseCookies(ctx.req.headers.cookie ?? "")[SESSION_COOKIE];
      if (token) await deleteSession(token);
      return { success: true } as const;
    }),
  }),

  // ── Pillars (public read, admin write) ──────────────────────────────────────
  pillars: router({
    list: publicProcedure.query(async () => {
      return getAllPillars();
    }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const pillar = await getPillarById(input.id);
        if (!pillar) throw new TRPCError({ code: "NOT_FOUND" });
        return pillar;
      }),

    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await createPillar(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updatePillar(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePillar(input.id);
        return { success: true };
      }),
  }),

  // ── Tracks ───────────────────────────────────────────────────────────────────
  tracks: router({
    byPillar: publicProcedure
      .input(z.object({ pillarId: z.number() }))
      .query(async ({ input }) => {
        return getTracksByPillar(input.pillarId);
      }),

    // Step 1: get a presigned S3 URL for direct browser-to-S3 upload (no file size limit)
    getUploadUrl: adminProcedure
      .input(z.object({
        pillarId: z.number(),
        fileName: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Normalize WAV MIME type variants
        const contentType =
          input.contentType === "audio/x-wav" || input.contentType === "audio/wave"
            ? "audio/wav"
            : input.contentType;
        const { generatePresignedUploadUrl } = await import("./s3Upload");
        return generatePresignedUploadUrl({
          fileName: input.fileName,
          contentType,
          folder: `tracks/pillar-${input.pillarId}`,
        });
      }),

    // Step 2: after browser uploads directly to S3, register the track in the DB
    create: adminProcedure
      .input(z.object({
        pillarId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        audioUrl: z.string(),
        audioKey: z.string(),
        sortOrder: z.number().optional(),
        durationSeconds: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const count = await countTracksByPillar(input.pillarId); // used only for sortOrder default
        await createTrack({
          pillarId: input.pillarId,
          title: input.title,
          description: input.description,
          audioUrl: input.audioUrl,
          audioKey: input.audioKey,
          durationSeconds: input.durationSeconds,
          sortOrder: input.sortOrder ?? count,
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTrack(input.id);
        return { success: true };
      }),

    allWithPillars: adminProcedure.query(async () => {
      return getAllTracksWithPillars();
    }),

    // Generate a proxy download URL for a track audio file (CDN-hosted, not in S3 bucket)
    getDownloadUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const track = await getTrackById(input.id);
        if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
        if (!track.audioUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "No audio file attached to this track" });
        // Return the direct public S3 URL — bucket is public, no presigning needed
        const { getPublicUrl } = await import("./s3Upload");
        const url = getPublicUrl(track.audioKey || track.audioUrl);
        const ext = (track.audioKey || track.audioUrl).split(".").pop()?.toLowerCase() ?? "wav";
        const safeTitle = track.title.replace(/[^a-zA-Z0-9\-_ ]/g, "").trim();
        const fileName = `${safeTitle}.${ext}`;
        return { url, fileName };
      }),

    // Return a presigned S3 GET URL for streaming (no Content-Disposition, valid 2h)
    getStreamUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const track = await getTrackById(input.id);
        if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });
        if (!track.audioUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "No audio file attached to this track" });
        const { generatePresignedStreamUrl } = await import("./s3Upload");
        const url = await generatePresignedStreamUrl(track.audioKey || track.audioUrl);
        return { url };
      }),
  }),

  // ── Comments ─────────────────────────────────────────────────────────────────
  comments: router({
    byTrack: protectedProcedure
      .input(z.object({ trackId: z.number() }))
      .query(async ({ input }) => {
        return getCommentsByTrack(input.trackId);
      }),

    add: protectedProcedure
      .input(z.object({
        trackId: z.number(),
        commenterName: z.string().min(1).max(100),
        content: z.string().min(1).max(2000),
        timestampSeconds: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const track = await getTrackById(input.trackId);
        if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });

        await createComment({
          trackId: input.trackId,
          userId: ctx.user.id,
          commenterName: input.commenterName,
          content: input.content,
          timestampSeconds: input.timestampSeconds,
        });

        // Notify owner
        const timeLabel = input.timestampSeconds != null
          ? ` at ${Math.floor(input.timestampSeconds / 60)}:${String(input.timestampSeconds % 60).padStart(2, "0")}`
          : "";
        await notifyOwner({
          title: `New comment on "${track.title}"`,
          content: `${input.commenterName} commented${timeLabel}: "${input.content}"`,
        });

        return { success: true };
      }),

    resolve: adminProcedure
      .input(z.object({
        id: z.number(),
        adminResponse: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input }) => {
        await resolveComment(input.id, input.adminResponse);
        return { success: true };
      }),

    unresolve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await unresolveComment(input.id);
        return { success: true };
      }),

    respond: adminProcedure
      .input(z.object({
        id: z.number(),
        adminResponse: z.string().min(1).max(2000),
      }))
      .mutation(async ({ input }) => {
        await respondToComment(input.id, input.adminResponse);
        return { success: true };
      }),

    all: adminProcedure.query(async () => {
      return getAllComments();
    }),
  }),

  // ── Per-Track Approvals ──────────────────────────────────────────────────────
  trackApprovals: router({
    myApproval: protectedProcedure
      .input(z.object({ trackId: z.number() }))
      .query(async ({ input, ctx }) => {
        const approval = await getTrackApprovalByTrackAndUser(input.trackId, ctx.user.id);
        return approval ?? null;
      }),

    set: protectedProcedure
      .input(z.object({
        trackId: z.number(),
        status: z.enum(["approved", "needs_changes", "rejected", "pending"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const track = await getTrackById(input.trackId);
        if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });

        await upsertTrackApproval({
          trackId: input.trackId,
          userId: ctx.user.id,
          status: input.status,
        });

        const statusLabel =
          input.status === "approved" ? "✅ Approved" :
          input.status === "needs_changes" ? "🔄 Needs Changes" :
          input.status === "rejected" ? "❌ Rejected" : "⏳ Pending";
        await notifyOwner({
          title: `Track "${track.title}" — ${statusLabel}`,
          content: `${ctx.user.name ?? "A client"} marked track "${track.title}" as ${input.status}`,
        });

        return { success: true };
      }),

    byTrack: adminProcedure
      .input(z.object({ trackId: z.number() }))
      .query(async ({ input }) => {
        return getTrackApprovalsByTrack(input.trackId);
      }),

    all: adminProcedure.query(async () => {
      return getAllTrackApprovals();
    }),
  }),

  // ── Approvals (legacy per-pillar) ──────────────────────────────────────────
  approvals: router({
    myApproval: protectedProcedure
      .input(z.object({ pillarId: z.number() }))
      .query(async ({ input, ctx }) => {
        const approval = await getApprovalByPillarAndUser(input.pillarId, ctx.user.id);
        return approval ?? null;
      }),

    set: protectedProcedure
      .input(z.object({
        pillarId: z.number(),
        status: z.enum(["approved", "rejected", "pending"]),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const pillar = await getPillarById(input.pillarId);
        if (!pillar) throw new TRPCError({ code: "NOT_FOUND", message: "Pillar not found" });

        await upsertApproval({
          pillarId: input.pillarId,
          userId: ctx.user.id,
          status: input.status,
          note: input.note,
        });

        // Notify owner
        const statusLabel = input.status === "approved" ? "✅ Approved" : input.status === "rejected" ? "❌ Rejected" : "⏳ Pending";
        await notifyOwner({
          title: `Pillar "${pillar.title}" — ${statusLabel}`,
          content: `${ctx.user.name ?? "A client"} marked pillar "${pillar.title}" as ${input.status}${input.note ? `. Note: "${input.note}"` : ""}`,
        });

        return { success: true };
      }),

    byPillar: adminProcedure
      .input(z.object({ pillarId: z.number() }))
      .query(async ({ input }) => {
        return getApprovalsByPillar(input.pillarId);
      }),

    all: adminProcedure.query(async () => {
      return getAllApprovals();
    }),
  }),

  // ── Projects (content hub) ───────────────────────────────────────────────────
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Guests (share sessions) can only see the one project they were invited to
      if (ctx.shareId !== undefined) {
        const db = await getDb();
        if (!db) return [];
        // Look up the projectId for this shareId
        const shareRows = await db
          .select({ projectId: projectShares.projectId })
          .from(projectShares)
          .where(eq(projectShares.id, ctx.shareId))
          .limit(1);
        if (!shareRows[0]) return [];
        const projectRows = await db
          .select()
          .from(projects)
          .where(eq(projects.id, shareRows[0].projectId))
          .limit(1);
        return projectRows;
      }
      return getAllProjects();
    }),

    listAdmin: adminProcedure.query(async () => {
      return getAllProjectsAdmin();
    }),

    bySlug: protectedProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const project = await getProjectBySlug(input.slug);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        return project;
      }),

    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        coverImageUrl: z.string().optional(),
        category: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await createProject(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        coverImageUrl: z.string().optional(),
        category: z.string().optional(),
        sortOrder: z.number().optional(),
        isPublished: z.number().optional(),
        projectStatus: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProject(id, data);
        return { success: true };
      }),

    // Admin: set project status (started / in_progress / completed)
    setStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["started", "in_progress", "completed"]),
      }))
      .mutation(async ({ input }) => {
        await updateProject(input.id, { projectStatus: input.status });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProject(input.id);
        return { success: true };
      }),

    reorder: adminProcedure
      .input(z.object({
        items: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
      }))
      .mutation(async ({ input }) => {
        await reorderProjects(input.items);
        return { success: true };
      }),
  }),

  // ── Deliverables ──────────────────────────────────────────────────────────────
  deliverables: router({
    byProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getDeliverablesByProject(input.projectId);
      }),

    create: adminProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        downloadUrl: z.string().optional(),
        fileType: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await createDeliverable(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        downloadUrl: z.string().optional(),
        fileType: z.string().optional(),
        fileKey: z.string().nullable().optional(),
        fileName: z.string().nullable().optional(),
        fileSize: z.number().nullable().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateDeliverable(id, data);
        return { success: true };
      }),

    getUploadUrl: adminProcedure
      .input(z.object({
        fileName: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generatePresignedUploadUrl } = await import("./s3Upload");
        return generatePresignedUploadUrl({
          fileName: input.fileName,
          contentType: input.contentType,
          folder: "deliverables",
        });
      }),

    // Client-facing: return direct public S3 URL for forced download (bucket is public)
    getDownloadUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDeliverableById } = await import("./db");
        const deliverable = await getDeliverableById(input.id);
        if (!deliverable) throw new TRPCError({ code: "NOT_FOUND", message: "Deliverable not found" });
        if (!deliverable.fileKey) throw new TRPCError({ code: "BAD_REQUEST", message: "No file attached to this deliverable" });
        const { getPublicUrl } = await import("./s3Upload");
        const url = getPublicUrl(deliverable.fileKey);
        return { url, fileName: deliverable.fileName ?? undefined };
      }),

    // Client-facing: generate a presigned stream URL (no Content-Disposition) for video/audio players
    getStreamUrl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getDeliverableById } = await import("./db");
        const deliverable = await getDeliverableById(input.id);
        if (!deliverable) throw new TRPCError({ code: "NOT_FOUND", message: "Deliverable not found" });
        if (!deliverable.fileKey) throw new TRPCError({ code: "BAD_REQUEST", message: "No file attached to this deliverable" });
        const { generatePresignedStreamUrl } = await import("./s3Upload");
        const url = await generatePresignedStreamUrl(deliverable.fileKey);
        return { url };
      }),

    // Client-facing: set review status (approved / needs_changes / pending)
    setReviewStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "needs_changes"]),
      }))
      .mutation(async ({ input }) => {
        await updateDeliverable(input.id, { reviewStatus: input.status });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDeliverable(input.id);
        return { success: true };
      }),

    reorder: adminProcedure
      .input(z.object({
        items: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await Promise.all(
          input.items.map(({ id, sortOrder }) =>
            db.update(deliverables).set({ sortOrder }).where(eq(deliverables.id, id))
          )
        );
        return { success: true };
      }),
  }),

  // ── Deliverable Comments ──────────────────────────────────────────────────────
  deliverableComments: router({
    byDeliverable: protectedProcedure
      .input(z.object({ deliverableId: z.number() }))
      .query(async ({ input }) => {
        return getCommentsByDeliverable(input.deliverableId);
      }),

    add: protectedProcedure
      .input(z.object({
        deliverableId: z.number(),
        commenterName: z.string().min(1).max(100),
        content: z.string().min(1).max(2000),
        timestampSeconds: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const deliverable = await getDeliverableById(input.deliverableId);
        if (!deliverable) throw new TRPCError({ code: "NOT_FOUND", message: "Deliverable not found" });

        await createDeliverableComment({
          deliverableId: input.deliverableId,
          userId: ctx.user.id,
          commenterName: input.commenterName,
          content: input.content,
          timestampSeconds: input.timestampSeconds,
        });

        const timeLabel = input.timestampSeconds != null
          ? ` at ${Math.floor(input.timestampSeconds / 60)}:${String(input.timestampSeconds % 60).padStart(2, "0")}`
          : "";
        await notifyOwner({
          title: `New comment on "${deliverable.title}"`,
          content: `${input.commenterName} commented on "${deliverable.title}"${timeLabel}: "${input.content}"`,
        });

        return { success: true };
      }),

    resolve: adminProcedure
      .input(z.object({
        id: z.number(),
        adminResponse: z.string().max(2000).optional(),
      }))
      .mutation(async ({ input }) => {
        await resolveDeliverableComment(input.id, input.adminResponse);
        return { success: true };
      }),

    unresolve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await unresolveDeliverableComment(input.id);
        return { success: true };
      }),

    respond: adminProcedure
      .input(z.object({
        id: z.number(),
        adminResponse: z.string().min(1).max(2000),
      }))
      .mutation(async ({ input }) => {
        await respondToDeliverableComment(input.id, input.adminResponse);
        return { success: true };
      }),

    all: adminProcedure.query(async () => {
      return getAllDeliverableComments();
    }),
  }),
  // ── Project Contacts ─────────────────────────────────────────────────────
  contacts: router({
    list: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(projectContacts).where(eq(projectContacts.projectId, input.projectId));
      }),

    add: adminProcedure
      .input(z.object({
        projectId: z.number(),
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.insert(projectContacts).values({
          projectId: input.projectId,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
          email: input.email,
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.delete(projectContacts).where(eq(projectContacts.id, input.id));
        return { success: true };
      }),
  }),

  // ── Email Notifications ────────────────────────────────────────────────────
  email: router({
    sendNotification: adminProcedure
      .input(z.object({
        projectId: z.number(),
        subject: z.string().min(1),
        customMessage: z.string().optional(),
        contactIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const projectUrl = `https://multiwing.faderlabs.ai/projects/${project.slug}`;

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        let allContacts = await db.select().from(projectContacts).where(eq(projectContacts.projectId, input.projectId));
        const targets = (input.contactIds && input.contactIds.length > 0)
          ? allContacts.filter((c) => input.contactIds!.includes(c.id))
          : allContacts;

        if (targets.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No contacts found for this project" });
        }

        const results: { contactId: number; email: string; success: boolean; error?: string }[] = [];
        for (const contact of targets) {
          // Generate a unique tracking token per email
          const trackingToken = nanoid(32);
          const result = await sendProjectNotification({
            to: contact.email,
            firstName: contact.firstName,
            projectTitle: project.title,
            projectUrl,
            subject: input.subject,
            customMessage: input.customMessage,
            trackingToken,
          });
          await db.insert(emailLog).values({
            projectId: input.projectId,
            contactId: contact.id,
            subject: input.subject,
            status: result.success ? "sent" : "failed",
            errorMessage: result.error ?? null,
            trackingToken: result.success ? trackingToken : null,
          });
          results.push({ contactId: contact.id, email: contact.email, ...result });
        }
        return { success: true, results };
      }),

    log: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select({
            id: emailLog.id,
            projectId: emailLog.projectId,
            contactId: emailLog.contactId,
            subject: emailLog.subject,
            status: emailLog.status,
            errorMessage: emailLog.errorMessage,
            openCount: emailLog.openCount,
            clickCount: emailLog.clickCount,
            firstOpenedAt: emailLog.firstOpenedAt,
            lastOpenedAt: emailLog.lastOpenedAt,
            firstClickedAt: emailLog.firstClickedAt,
            sentAt: emailLog.sentAt,
            recipientFirstName: projectContacts.firstName,
            recipientLastName: projectContacts.lastName,
            recipientEmail: projectContacts.email,
          })
          .from(emailLog)
          .leftJoin(projectContacts, eq(emailLog.contactId, projectContacts.id))
          .where(eq(emailLog.projectId, input.projectId))
          .orderBy(emailLog.sentAt);
      }),

    // All email logs across all projects for the admin dashboard
    allLogs: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: emailLog.id,
          projectId: emailLog.projectId,
          contactId: emailLog.contactId,
          subject: emailLog.subject,
          status: emailLog.status,
          errorMessage: emailLog.errorMessage,
          openCount: emailLog.openCount,
          clickCount: emailLog.clickCount,
          firstOpenedAt: emailLog.firstOpenedAt,
          lastOpenedAt: emailLog.lastOpenedAt,
          firstClickedAt: emailLog.firstClickedAt,
          sentAt: emailLog.sentAt,
          recipientFirstName: projectContacts.firstName,
          recipientLastName: projectContacts.lastName,
          recipientEmail: projectContacts.email,
        })
        .from(emailLog)
        .leftJoin(projectContacts, eq(emailLog.contactId, projectContacts.id))
        .orderBy(emailLog.sentAt);
    }),
  }),
  // ── Client Project Requests ──────────────────────────────────────────────────────────────────
  clientRequests: router({
    // Generate a presigned S3 URL for direct browser-to-S3 upload (no file size limit)
    getUploadUrl: publicProcedure
      .input(z.object({
        fileName: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generatePresignedUploadUrl } = await import("./s3Upload");
        return generatePresignedUploadUrl({
          fileName: input.fileName,
          contentType: input.contentType,
          folder: "client-project-requests",
        });
      }),

    // Generate a presigned download URL for a file (admin only)
    getDownloadUrl: adminProcedure
      .input(z.object({ fileKey: z.string() }))
      .mutation(async ({ input }) => {
        const { generatePresignedDownloadUrl } = await import("./s3Upload");
        const url = await generatePresignedDownloadUrl(input.fileKey);
        return { url };
      }),

    // Submit a new project request after files have been uploaded
    submit: publicProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        submitterName: z.string().min(1).max(200),
        submitterEmail: z.string().email(),
        files: z.array(z.object({
          name: z.string(),
          url: z.string(),
          key: z.string(),
          size: z.number(),
          type: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        await createClientProjectRequest({
          title: input.title,
          description: input.description,
          submitterName: input.submitterName,
          submitterEmail: input.submitterEmail,
          files: JSON.stringify(input.files),
        });

        // Send notification emails to Faderlabs team
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.default.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        const fileList = input.files.length > 0
          ? input.files.map((f) => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`).join("\n")
          : "No files attached";
        const body = `New project request submitted on the Multi-Wing Content Hub.

Title: ${input.title}
From: ${input.submitterName} <${input.submitterEmail}>
${input.description ? `\nDescription:\n${input.description}` : ""}

Files uploaded (${input.files.length}):
${fileList}

View in admin dashboard: https://multiwing.faderlabs.ai/admin`;

        const recipients = ["raul@faderlabs.com", "hello@faderlabs.com"];
        for (const to of recipients) {
          try {
            await transporter.sendMail({
              from: `"Multi-Wing Portal" <${process.env.SMTP_USER}>`,
              to,
              subject: `New Project Request: ${input.title}`,
              text: body,
            });
          } catch (e) {
            console.error(`[clientRequests] Failed to notify ${to}:`, e);
          }
        }

        return { success: true };
      }),

    // List all requests (admin only)
    list: adminProcedure.query(async () => {
      return getAllClientProjectRequests();
    }),

    // Update status (admin only)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "in_review", "completed"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateClientProjectRequestStatus(input.id, input.status, input.adminNotes);
        return { success: true };
      }),

    // Delete a project request (admin only)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteClientProjectRequest(input.id);
        return { success: true };
      }),
  }),

  // ── Sonic Branding Settings ──────────────────────────────────────────────────────────────────────────────
  sonicBrandingSettings: router({
    // Get hero title and subtitle (public)
    get: publicProcedure.query(async () => {
      const settings = await getSiteSettings([
        "sonic_branding_hero_title",
        "sonic_branding_hero_subtitle",
      ]);
      return {
        heroTitle: settings["sonic_branding_hero_title"] ?? "Sonic Branding Proposal",
        heroSubtitle: settings["sonic_branding_hero_subtitle"] ?? "Listen to each track, click the progress bar to leave timestamped feedback, and mark your decision for each track.",
      };
    }),
    // Update hero title and/or subtitle (admin only)
    update: adminProcedure
      .input(z.object({
        heroTitle: z.string().min(1).max(200).optional(),
        heroSubtitle: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.heroTitle !== undefined) {
          await setSiteSetting("sonic_branding_hero_title", input.heroTitle);
        }
        if (input.heroSubtitle !== undefined) {
          await setSiteSetting("sonic_branding_hero_subtitle", input.heroSubtitle);
        }
        return { success: true };
      }),
  }),

  // ── Image Upload ──────────────────────────────────────────────────────────────────────────────────
  uploadImage: router({
    upload: adminProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string().regex(/^image\//),
        fileBase64: z.string(),
        folder: z.string().default("images"),
      }))
      .mutation(async ({ input }) => {
        const suffix = nanoid(8);
        const ext = input.filename.split(".").pop() ?? "jpg";
        const key = `${input.folder}/${suffix}.${ext}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(key, buffer, input.contentType);
        return { success: true, url, key };
      }),
  }),
});
export type AppRouter = typeof appRouter;
