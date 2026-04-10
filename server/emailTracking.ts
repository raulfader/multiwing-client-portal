import express, { Router } from "express";
import { getDb } from "./db";
import { emailLog, emailEvents } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// 1x1 transparent GIF pixel (base64 decoded)
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export function registerEmailTrackingRoutes(app: express.Express | Router) {
  // ── Open Tracking: GET /api/track/open/:token ─────────────────────────────
  // Serves a 1x1 transparent GIF and records the open event
  // NOTE: Must be under /api/ prefix so production routing handles it server-side
  (app as any).get("/api/track/open/:token", async (req: any, res: any) => {
    const { token } = req.params;
    try {
      const db = await getDb();
      if (db) {
        // Find the email log entry by tracking token
        const [log] = await db
          .select({ id: emailLog.id, firstOpenedAt: emailLog.firstOpenedAt })
          .from(emailLog)
          .where(eq(emailLog.trackingToken, token))
          .limit(1);

        if (log) {
          const now = new Date();
          // Increment open count, update timestamps
          await db
            .update(emailLog)
            .set({
              openCount: sql`${emailLog.openCount} + 1`,
              lastOpenedAt: now,
              ...(log.firstOpenedAt ? {} : { firstOpenedAt: now }),
            })
            .where(eq(emailLog.id, log.id));

          // Record the event
          await db.insert(emailEvents).values({
            emailLogId: log.id,
            eventType: "open",
            userAgent: req.headers["user-agent"] ?? null,
            ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null,
          });
        }
      }
    } catch (err) {
      // Silently fail — never block the pixel response
      console.error("[email-tracking] open error:", err);
    }

    // Always serve the pixel regardless of DB errors
    res.set({
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    res.send(TRACKING_PIXEL);
  });

  // ── Click Tracking: GET /api/track/click/:token ───────────────────────────
  // Records the click and redirects to the destination URL
  // NOTE: Must be under /api/ prefix so production routing handles it server-side
  (app as any).get("/api/track/click/:token", async (req: any, res: any) => {
    const { token } = req.params;
    const destination = req.query.url as string;

    // Validate destination URL to prevent open redirect abuse
    const safeDestination = (() => {
      try {
        const url = new URL(destination);
        // Only allow https links to known domains
        if (url.protocol !== "https:") return null;
        return url.toString();
      } catch {
        return null;
      }
    })();

    if (!safeDestination) {
      res.status(400).send("Invalid redirect URL");
      return;
    }

    try {
      const db = await getDb();
      if (db) {
        const [log] = await db
          .select({ id: emailLog.id, firstClickedAt: emailLog.firstClickedAt })
          .from(emailLog)
          .where(eq(emailLog.trackingToken, token))
          .limit(1);

        if (log) {
          const now = new Date();
          await db
            .update(emailLog)
            .set({
              clickCount: sql`${emailLog.clickCount} + 1`,
              ...(log.firstClickedAt ? {} : { firstClickedAt: now }),
            })
            .where(eq(emailLog.id, log.id));

          await db.insert(emailEvents).values({
            emailLogId: log.id,
            eventType: "click",
            url: safeDestination,
            userAgent: req.headers["user-agent"] ?? null,
            ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null,
          });
        }
      }
    } catch (err) {
      console.error("[email-tracking] click error:", err);
    }

    res.redirect(302, safeDestination);
  });
}
