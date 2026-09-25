import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { expandHome, type Config } from "./config";

const CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mxf: "application/mxf",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  key: "application/vnd.apple.keynote",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  srt: "application/x-subrip",
  vtt: "text/vtt",
};

/** Mirrors the web uploader: WAV variants are normalised because S3 signs the exact Content-Type. */
export function normalizeContentType(contentType: string): string {
  return contentType === "audio/x-wav" || contentType === "audio/wave" ? "audio/wav" : contentType;
}

export function guessContentType(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** Same MIME → deliverable fileType mapping as the admin UI's DeliverableFileUpload. */
export function detectFileType(contentType: string): "video" | "audio" | "image" | "archive" | "document" {
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("image/")) return "image";
  if (contentType === "application/zip" || contentType === "application/x-zip-compressed") return "archive";
  return "document";
}

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, "_").trim();
  return cleaned || "file";
}

function assertWithinRoots(resolved: string, config: Config) {
  if (config.fileRoots.length === 0) return;
  const allowed = config.fileRoots.some((root) => {
    const rel = path.relative(root, resolved);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });
  if (!allowed) {
    throw new Error(`Path ${resolved} is outside MULTIWING_FILE_ROOTS (${config.fileRoots.join(path.delimiter)}).`);
  }
}

export async function resolveReadableFile(filePath: string, config: Config) {
  const resolved = path.resolve(expandHome(filePath));
  assertWithinRoots(resolved, config);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isFile()) throw new Error(`File not found: ${resolved}`);
  return { path: resolved, size: stat.size, name: path.basename(resolved) };
}

/**
 * Resolves where a download should be written. `saveTo` may be a directory
 * (existing, or ending in a path separator) or a full file path; it defaults
 * to MULTIWING_DOWNLOAD_DIR.
 */
export async function resolveDownloadTarget(saveTo: string | undefined, suggestedName: string, config: Config) {
  const fileName = sanitizeFileName(suggestedName);
  let target: string;
  if (!saveTo) {
    target = path.join(config.downloadDir, fileName);
  } else {
    const resolved = path.resolve(expandHome(saveTo));
    const stat = await fs.stat(resolved).catch(() => null);
    const isDir = stat?.isDirectory() || /[\\/]$/.test(saveTo);
    target = isDir ? path.join(resolved, fileName) : resolved;
  }
  assertWithinRoots(target, config);
  await fs.mkdir(path.dirname(target), { recursive: true });
  return target;
}

/** Streams a local file to a presigned S3 PUT URL (S3 requires an explicit Content-Length). */
export function putFileToPresignedUrl(uploadUrl: string, filePath: string, contentType: string, size: number): Promise<void> {
  const url = new URL(uploadUrl);
  const transport = url.protocol === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      { method: "PUT", headers: { "Content-Type": contentType, "Content-Length": size } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) return resolve();
          const body = Buffer.concat(chunks).toString("utf8");
          const s3Message = body.match(/<Message>([^<]+)<\/Message>/)?.[1];
          reject(new Error(`Upload failed (${status})${s3Message ? `: ${s3Message}` : ""}`));
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    const stream = createReadStream(filePath);
    stream.on("error", (err) => {
      req.destroy(err);
      reject(err);
    });
    stream.pipe(req);
  });
}

/** Streams a URL to disk via a temp file so partial downloads never masquerade as complete. */
export async function downloadUrlToFile(url: string, target: string, fetchImpl: typeof fetch = fetch): Promise<number> {
  const res = await fetchImpl(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status} ${res.statusText})`);
  const tmp = `${target}.part`;
  try {
    await pipeline(Readable.fromWeb(res.body as WebReadableStream<Uint8Array>), createWriteStream(tmp));
    await fs.rename(tmp, target);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
  return (await fs.stat(target)).size;
}

export function slugify(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "project"
  );
}
