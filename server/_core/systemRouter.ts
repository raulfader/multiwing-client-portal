import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getActivityLogSince } from "../db";
import { sendDigestEmail } from "../email";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * Called by the 6-hour heartbeat schedule.
   * Queries activity_log for the last 6 hours and sends a digest email
   * only if there is at least one event. Safe to call multiple times.
   */
  sendDigest: publicProcedure
    .mutation(async () => {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      const rows = await getActivityLogSince(sixHoursAgo);
      if (rows.length === 0) return { sent: false, reason: "no_activity" };

      const comments = rows.filter((r) => r.eventType === "comment");
      const downloads = rows.filter((r) => r.eventType === "download");

      // Build a human-readable period label in EST
      const fmt = (d: Date) =>
        d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/New_York",
        });
      const periodLabel = `${fmt(sixHoursAgo)} – ${fmt(now)} EST`;

      const result = await sendDigestEmail({ periodLabel, comments, downloads });
      return { sent: true, ...result };
    }),
});
