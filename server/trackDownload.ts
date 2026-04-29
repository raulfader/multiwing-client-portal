import type { Express } from "express";
import { getTrackById } from "./db";
import { validateSession, SESSION_COOKIE } from "./customAuth";

/**
 * GET /api/tracks/download/:id?filename=Track_Title.wav
 *
 * Proxies the CDN audio file back to the browser with a proper
 * Content-Disposition: attachment header so the browser downloads it
 * with the track title as the filename instead of the CDN hash path.
 *
 * Auth: requires a valid session cookie (same as tRPC protectedProcedure).
 */
export function registerTrackDownloadRoute(app: Express) {
  (app as any).get("/api/tracks/download/:id", async (req: any, res: any) => {
    try {
      // Validate session from cookie
      const token = req.cookies?.[SESSION_COOKIE] || req.headers.cookie?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
      const session = token ? await validateSession(token) : null;
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid track id" });

      const track = await getTrackById(id);
      if (!track || !track.audioUrl) {
        return res.status(404).json({ error: "Track not found" });
      }

      // Determine filename: prefer query param (already URL-encoded by tRPC procedure), fall back to title
      const ext = (track.audioKey || track.audioUrl).split(".").pop()?.toLowerCase() ?? "wav";
      const safeTitle = track.title.replace(/[^a-zA-Z0-9\-_ ]/g, "").trim();
      const rawFilename = req.query.filename
        ? decodeURIComponent(req.query.filename as string)
        : `${safeTitle}.${ext}`;

      // Fetch from CDN
      const upstream = await fetch(track.audioUrl);
      if (!upstream.ok) {
        return res.status(502).json({ error: "Failed to fetch audio from CDN" });
      }

      // Set response headers
      const contentType = upstream.headers.get("content-type") || getMimeType(ext);
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${rawFilename}"; filename*=UTF-8''${encodeURIComponent(rawFilename)}`
      );
      const contentLength = upstream.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      // Pipe the body
      const reader = upstream.body?.getReader();
      if (!reader) return res.status(502).json({ error: "No body from CDN" });

      res.on("close", () => reader.cancel());
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (err: any) {
      console.error("[trackDownload] error:", err?.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    wav: "audio/wav",
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
    m4a: "audio/mp4",
  };
  return map[ext] ?? "application/octet-stream";
}
