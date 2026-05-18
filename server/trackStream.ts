import type { Express } from "express";
import { parse as parseCookies } from "cookie";
import { getTrackById } from "./db";
import { validateSession, SESSION_COOKIE } from "./customAuth";
import { generatePresignedStreamUrl } from "./s3Upload";

/**
 * GET /api/tracks/stream/:id
 *
 * Proxies the S3 audio file to the browser with proper HTTP Range support
 * so the HTML <audio> element can seek, display duration, and show progress.
 *
 * Auth: x-session-token header (localStorage) or portal_session cookie.
 * Supports both regular (portal_session_token) and guest (guest_session_token) tokens.
 */
export function registerTrackStreamRoute(app: Express) {
  (app as any).get("/api/tracks/stream/:id", async (req: any, res: any) => {
    try {
      // Auth: query param token (used by <audio src> which can't send custom headers),
      // then x-session-token header, then cookie.
      // Accepts both portal_session_token (regular users) and guest_session_token.
      const token =
        (req.query.token as string | undefined) ??
        (req.headers["x-session-token"] as string | undefined) ??
        parseCookies(req.headers.cookie ?? "")[SESSION_COOKIE];
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

      // Get a fresh presigned S3 GET URL (valid 2h, no Content-Disposition)
      const audioKey = track.audioKey || track.audioUrl;
      const streamUrl = await generatePresignedStreamUrl(audioKey);

      const ext = audioKey.split(".").pop()?.toLowerCase() ?? "wav";
      const contentType = getMimeType(ext);

      // Forward the Range header if the browser sends one (required for seeking)
      const rangeHeader = req.headers["range"] as string | undefined;
      const upstreamHeaders: Record<string, string> = {
        "Accept-Ranges": "bytes",
      };
      if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;

      const upstream = await fetch(streamUrl, { headers: upstreamHeaders });

      if (!upstream.ok && upstream.status !== 206) {
        return res.status(502).json({ error: "Failed to fetch audio from S3" });
      }

      // Mirror relevant headers from S3 response
      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "no-store"); // presigned URLs expire; don't cache

      const contentLength = upstream.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const contentRange = upstream.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);

      // Use 206 Partial Content when the browser sent a Range request
      res.status(rangeHeader ? 206 : 200);

      // Stream the body
      const reader = upstream.body?.getReader();
      if (!reader) return res.status(502).json({ error: "No body from S3" });

      res.on("close", () => reader.cancel());
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (err: any) {
      console.error("[trackStream] error:", err?.message);
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
