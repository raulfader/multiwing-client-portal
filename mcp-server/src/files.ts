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

/** Portal file names can come from public request submissions, so they are never trusted as paths. */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, "_").trim();
  return !cleaned || /^\.+$/.test(cleaned) ? "file" : cleaned;
}

/** Credential stores that must never be uploaded, even inside an allowed root. */
const SENSITIVE_SEGMENTS = new Set([".ssh", ".aws", ".gnupg", ".kube", ".docker", ".azure", ".config/gcloud", ".password-store"]);
const SENSITIVE_NAME = /^(\.env(\..*)?|\.npmrc|\.netrc|\.pgpass|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|.*\.(pem|p12|pfx|keystore|jks))$/i;

function assertNotSensitive(realPath: string) {
  const segments = realPath.split(path.sep);
  const joined = segments.join("/");
  const hit =
    segments.some((s) => SENSITIVE_SEGMENTS.has(s)) ||
    [...SENSITIVE_SEGMENTS].some((s) => s.includes("/") && joined.includes(`/${s}/`)) ||
    SENSITIVE_NAME.test(path.basename(realPath));
  if (hit) throw new Error(`Refusing to upload ${realPath}: it looks like a credential or secret file.`);
}

/** realpath of the deepest existing ancestor + the not-yet-existing remainder. */
async function realpathLoose(p: string): Promise<string> {
  let current = p;
  const rest: string[] = [];
  for (;;) {
    try {
      return path.join(await fs.realpath(current), ...rest.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return p;
      rest.push(path.basename(current));
      current = parent;
    }
  }
}

async function assertWithinRoots(resolved: string, config: Config) {
  if (config.fileRoots.length === 0) return;
  const real = await realpathLoose(resolved);
  const roots = await Promise.all(config.fileRoots.map(realpathLoose));
  const allowed = roots.some((root) => {
    const rel = path.relative(root, real);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });
  if (!allowed) {
    throw new Error(
      `Path ${resolved} is outside the allowed folders (${config.fileRoots.join(path.delimiter)}). Add its folder to MULTIWING_FILE_ROOTS.`
    );
  }
}

export async function resolveReadableFile(filePath: string, config: Config) {
  const resolved = path.resolve(expandHome(filePath));
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat?.isFile()) throw new Error(`File not found: ${resolved}`);
  const real = await fs.realpath(resolved);
  await assertWithinRoots(real, config);
  assertNotSensitive(real);
  return { path: real, size: stat.size, name: path.basename(resolved) };
}

/** Resolves a directory for bulk downloads, checking roots before anything is created. */
export async function resolveDownloadDir(dir: string, config: Config) {
  const resolved = path.resolve(expandHome(dir));
  await assertWithinRoots(resolved, config);
  await fs.mkdir(resolved, { recursive: true });
  return resolved;
}

/** `name.ext` -> `name (1).ext` … so downloads never overwrite existing files. */
async function uniquePath(target: string): Promise<string> {
  const ext = path.extname(target);
  const stem = target.slice(0, target.length - ext.length);
  let candidate = target;
  for (let n = 1; await fs.stat(candidate).then(() => true, () => false); n++) {
    candidate = `${stem} (${n})${ext}`;
  }
  return candidate;
}

/**
 * Resolves where a download should be written. `saveTo` may be a directory
 * (existing, or ending in a path separator) or a full file path; it defaults
 * to MULTIWING_DOWNLOAD_DIR. Existing files are never overwritten.
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
  await assertWithinRoots(target, config);
  await fs.mkdir(path.dirname(target), { recursive: true });
  return uniquePath(target);
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
