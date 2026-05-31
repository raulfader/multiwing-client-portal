/**
 * POST /api/transcoding/complete
 * Called by the AWS Lambda transcoder when a proxy is ready (or failed).
 * Updates the deliverable's proxyUrl, proxyKey, and proxyStatus in the DB.
 */
import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { deliverables } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const WEBHOOK_SECRET = process.env.TRANSCODING_WEBHOOK_SECRET;

interface TranscodingWebhookPayload {
  deliverableId: number;
  status: "processing" | "ready" | "failed";
  proxyKey?: string | null;
  proxyUrl?: string | null;
  error?: string;
  secret?: string;
}

export function registerTranscodingWebhook(app: Express) {
  app.post("/api/transcoding/complete", async (req: Request, res: Response) => {
    try {
      // Validate webhook secret
      const incomingSecret =
        req.headers["x-webhook-secret"] || (req.body as TranscodingWebhookPayload)?.secret;
      if (WEBHOOK_SECRET && incomingSecret !== WEBHOOK_SECRET) {
        console.warn("[Transcoding Webhook] Invalid secret");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = req.body as TranscodingWebhookPayload;
      const { deliverableId, status, proxyKey, proxyUrl } = payload;

      if (!deliverableId || !status) {
        return res.status(400).json({ error: "Missing deliverableId or status" });
      }

      console.log(`[Transcoding Webhook] deliverable=${deliverableId} status=${status}`);

      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db
        .update(deliverables)
        .set({
          proxyStatus: status,
          proxyKey: proxyKey ?? null,
          proxyUrl: proxyUrl ?? null,
          updatedAt: new Date(),
        })
        .where(eq(deliverables.id, deliverableId));

      return res.json({ ok: true });
    } catch (err) {
      console.error("[Transcoding Webhook] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
