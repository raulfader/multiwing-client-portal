/**
 * Self-contained 6-hour activity digest cron job.
 * Runs entirely inside the Node.js server process — no Manus agent, no credits consumed.
 *
 * Schedule: 0 6,12,18,0 * * *  (6am, 12pm, 6pm, midnight) in America/New_York
 * Behaviour: queries activity_log for the last 6 hours; sends digest email to the
 *            admin only if at least one event exists; otherwise does nothing.
 */
import cron from "node-cron";
import { getActivityLogSince } from "./db";
import { sendDigestEmail } from "./email";

export function startDigestCron(): void {
  // Fire at minute 0 of hours 0, 6, 12, 18 — Eastern time
  cron.schedule(
    "0 0,6,12,18 * * *",
    async () => {
      try {
        const now = new Date();
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

        const rows = await getActivityLogSince(sixHoursAgo);
        if (rows.length === 0) {
          console.log("[digest-cron] No activity in the last 6 hours — skipping email.");
          return;
        }

        const comments = rows.filter((r) => r.eventType === "comment");
        const downloads = rows.filter((r) => r.eventType === "download");

        const fmt = (d: Date) =>
          d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/New_York",
          });
        const periodLabel = `${fmt(sixHoursAgo)} – ${fmt(now)} EST`;

        const result = await sendDigestEmail({ periodLabel, comments, downloads });
        console.log(
          `[digest-cron] Digest sent — ${comments.length} comment(s), ${downloads.length} download(s).`,
          result
        );
      } catch (err) {
        console.error("[digest-cron] Failed to send digest:", err);
      }
    },
    {
      timezone: "America/New_York",
    }
  );

  console.log("[digest-cron] 6-hour activity digest cron scheduled (0 0,6,12,18 * * * ET).");
}
