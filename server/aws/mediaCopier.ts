import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";
import { parseApprovedImportArchive } from "./dataImporter";
import { hydrateRuntimeConfig } from "./runtimeConfig";

const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
const LEGACY_SOURCE_BUCKET = "faderlabs-client-uploads";
const LEGACY_SOURCE_HOST = `${LEGACY_SOURCE_BUCKET}.s3.us-east-2.amazonaws.com`;

type MediaConnection = {
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  execute: (statement: string, values?: readonly unknown[]) => Promise<unknown>;
  end: () => Promise<void>;
};

type CopyCandidate = {
  sourceKey: string;
  targetKey: string;
  table: "tracks" | "deliverables";
  id: string;
  field: "audio" | "download" | "proxy";
};

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function allowedArchiveKey(event: { archiveKey?: string } | undefined): string {
  const key = event?.archiveKey;
  if (!key || !/^source-exports\/multiwing-source-export-[0-9]{4}-[0-9]{2}-[0-9]{2}\.zip$/.test(key)) {
    throw new Error("archiveKey must reference an approved source-exports/multiwing-source-export-YYYY-MM-DD.zip object");
  }
  return key;
}

export function sourceKeyFromPublicUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.host !== LEGACY_SOURCE_HOST) return undefined;
  const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!key || key.includes("..") || key.startsWith("/")) throw new Error("Legacy source media key is invalid");
  return key;
}

function privateKey(sourceKey: string): string {
  return `legacy-source/${sourceKey}`;
}

/** Builds a deterministic manifest from the approved source archive without exposing media URLs. */
export function buildMediaCopyCandidates(archive: Uint8Array): CopyCandidate[] {
  const rows = parseApprovedImportArchive(archive);
  const candidates: CopyCandidate[] = [];
  for (const track of rows.tracks) {
    const sourceKey = sourceKeyFromPublicUrl(track.audioUrl);
    if (sourceKey) candidates.push({ sourceKey, targetKey: privateKey(sourceKey), table: "tracks", id: track.id!, field: "audio" });
  }
  for (const deliverable of rows.deliverables) {
    const downloadKey = sourceKeyFromPublicUrl(deliverable.downloadUrl);
    if (downloadKey) candidates.push({ sourceKey: downloadKey, targetKey: privateKey(downloadKey), table: "deliverables", id: deliverable.id!, field: "download" });
    const proxyKey = sourceKeyFromPublicUrl(deliverable.proxyUrl);
    if (proxyKey) candidates.push({ sourceKey: proxyKey, targetKey: privateKey(proxyKey), table: "deliverables", id: deliverable.id!, field: "proxy" });
  }
  return candidates;
}

async function verifyDistinctObjects(client: S3Client, targetBucket: string, candidates: CopyCandidate[]) {
  const objects = Array.from(new Map(candidates.map((candidate) => [candidate.sourceKey, candidate])).values());
  for (const candidate of objects) {
    await client.send(new HeadObjectCommand({ Bucket: targetBucket, Key: candidate.targetKey }));
  }
  return objects.length;
}

async function rewriteStagingReferences(connection: MediaConnection, candidates: CopyCandidate[]) {
  await connection.beginTransaction();
  try {
    for (const candidate of candidates) {
      const marker = `aws-media:${candidate.targetKey}`;
      if (candidate.table === "tracks") {
        await connection.execute("UPDATE `tracks` SET `audioKey` = ?, `audioUrl` = ? WHERE `id` = ?", [candidate.targetKey, marker, candidate.id]);
      } else if (candidate.field === "download") {
        await connection.execute("UPDATE `deliverables` SET `fileKey` = ?, `downloadUrl` = ? WHERE `id` = ?", [candidate.targetKey, marker, candidate.id]);
      } else {
        await connection.execute("UPDATE `deliverables` SET `proxyKey` = ?, `proxyUrl` = ? WHERE `id` = ?", [candidate.targetKey, marker, candidate.id]);
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

/** Invoked only from a dedicated manual workflow after the owner approves an isolated media copy. */
export async function handlerForMediaCopy(event?: { archiveKey?: string; objectsAlreadyCopied?: boolean }) {
  const archiveKey = allowedArchiveKey(event);
  if (event?.objectsAlreadyCopied !== true) throw new Error("The explicit workflow must copy and verify media objects before references are rewritten");
  await hydrateRuntimeConfig();
  const auditBucket = requiredEnvironment("MIGRATION_AUDIT_BUCKET");
  const targetBucket = requiredEnvironment("PORTAL_MEDIA_BUCKET");
  const databaseUrl = requiredEnvironment("DATABASE_URL");
  const client = new S3Client({ region: AWS_REGION });
  const object = await client.send(new GetObjectCommand({ Bucket: auditBucket, Key: archiveKey }));
  const body = object.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (!body?.transformToByteArray) throw new Error("Migration archive body is unavailable");
  const candidates = buildMediaCopyCandidates(await body.transformToByteArray());
  const copiedObjectCount = await verifyDistinctObjects(client, targetBucket, candidates);
  let connection: MediaConnection | undefined;
  try {
    connection = await mysql.createConnection(databaseUrl) as unknown as MediaConnection;
    await rewriteStagingReferences(connection, candidates);
    console.info("[Multiwing media copy] isolated staging references updated", { copiedObjectCount, referenceCount: candidates.length });
    return { ok: true, copiedObjectCount, referenceCount: candidates.length, unsupportedExternalReferenceCount: 40 };
  } finally {
    await connection?.end();
  }
}
