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
} from "./db";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { nanoid } from "nanoid";

// ── Admin guard middleware ─────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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

    getUploadUrl: adminProcedure
      .input(z.object({
        pillarId: z.number(),
        filename: z.string(),
        contentType: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        durationSeconds: z.number().optional(),
        fileBase64: z.string(), // base64 encoded audio
      }))
      .mutation(async ({ input }) => {
        // Check max 2 tracks per pillar
        const count = await countTracksByPillar(input.pillarId);
        if (count >= 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Maximum 2 tracks per pillar allowed",
          });
        }

        const suffix = nanoid(8);
        const ext = input.filename.split(".").pop() ?? "mp3";
        const key = `tracks/pillar-${input.pillarId}/${suffix}.${ext}`;

        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(key, buffer, input.contentType);

        await createTrack({
          pillarId: input.pillarId,
          title: input.title,
          description: input.description,
          audioUrl: url,
          audioKey: key,
          durationSeconds: input.durationSeconds,
          sortOrder: input.sortOrder ?? count,
        });

        return { success: true, url, key };
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
        content: z.string().min(1).max(2000),
        timestampSeconds: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const track = await getTrackById(input.trackId);
        if (!track) throw new TRPCError({ code: "NOT_FOUND", message: "Track not found" });

        await createComment({
          trackId: input.trackId,
          userId: ctx.user.id,
          content: input.content,
          timestampSeconds: input.timestampSeconds,
        });

        // Notify owner
        const timeLabel = input.timestampSeconds != null
          ? ` at ${Math.floor(input.timestampSeconds / 60)}:${String(input.timestampSeconds % 60).padStart(2, "0")}`
          : "";
        await notifyOwner({
          title: `New comment on "${track.title}"`,
          content: `${ctx.user.name ?? "A client"} commented${timeLabel}: "${input.content}"`,
        });

        return { success: true };
      }),

    all: adminProcedure.query(async () => {
      return getAllComments();
    }),
  }),

  // ── Approvals ─────────────────────────────────────────────────────────────────
  approvals: router({
    myApproval: protectedProcedure
      .input(z.object({ pillarId: z.number() }))
      .query(async ({ input, ctx }) => {
        return getApprovalByPillarAndUser(input.pillarId, ctx.user.id);
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
});

export type AppRouter = typeof appRouter;
