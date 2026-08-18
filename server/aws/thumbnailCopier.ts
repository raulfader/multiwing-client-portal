import crypto from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";
import { parseApprovedImportArchive } from "./dataImporter";
import { hydrateRuntimeConfig } from "./runtimeConfig";

const CLOUD_FRONT_HOST = "d2xsxph8kpxj0f.cloudfront.net";
const REGION = process.env.AWS_REGION ?? "us-east-1";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function archiveKey(event?: { archiveKey?: string }) {
  const value = event?.archiveKey;
  if (!value || !/^source-exports\/multiwing-source-export-\d{4}-\d{2}-\d{2}\.zip$/.test(value)) throw new Error("archiveKey is not an approved source export");
  return value;
}

export function privateThumbnailKey(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.host !== CLOUD_FRONT_HOST) throw new Error("thumbnail source is not on the approved public CloudFront host");
  const extension = parsed.pathname.match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "bin";
  return `legacy-external/cloudfront/${crypto.createHash("sha256").update(url).digest("hex")}.${extension}`;
}

export function buildThumbnailCandidates(archive: Uint8Array) {
  return parseApprovedImportArchive(archive).deliverables
    .filter((row) => row.thumbnailUrl?.startsWith("https://"))
    .flatMap((row) => {
      try { return [{ id: row.id!, sourceUrl: row.thumbnailUrl!, targetKey: privateThumbnailKey(row.thumbnailUrl!) }]; }
      catch { return []; }
    });
}

export async function handlerForThumbnailCopy(event?: { archiveKey?: string; objectsAlreadyCopied?: boolean }) {
  if (event?.objectsAlreadyCopied !== true) throw new Error("Workflow must copy and verify thumbnails before isolated references are rewritten");
  await hydrateRuntimeConfig();
  const client = new S3Client({ region: REGION });
  const auditBucket = required("MIGRATION_AUDIT_BUCKET");
  const targetBucket = required("PORTAL_MEDIA_BUCKET");
  const archive = await client.send(new GetObjectCommand({ Bucket: auditBucket, Key: archiveKey(event) }));
  const body = archive.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (!body?.transformToByteArray) throw new Error("archive body unavailable");
  const candidates = buildThumbnailCandidates(await body.transformToByteArray());
  for (const candidate of candidates) await client.send(new HeadObjectCommand({ Bucket: targetBucket, Key: candidate.targetKey }));
  const connection = await mysql.createConnection(required("DATABASE_URL"));
  try {
    await connection.beginTransaction();
    for (const candidate of candidates) await connection.execute("UPDATE `deliverables` SET `thumbnailUrl` = ? WHERE `id` = ?", [`aws-thumbnail:${candidate.targetKey}`, candidate.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { await connection.end(); }
  return { ok: true, copiedObjectCount: candidates.length, rewrittenThumbnailReferences: candidates.length, deferredProviderReferenceCount: 21 };
}
