import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

export function resolveS3Credentials(env: NodeJS.ProcessEnv = process.env) {
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = env.AWS_SESSION_TOKEN;

  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }

  return {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  };
}

function getS3Client() {
  const region = process.env.AWS_S3_REGION || "us-east-2";
  const credentials = resolveS3Credentials();
  return new S3Client({
    region,
    ...(credentials ? { credentials } : {}),
    // Disable automatic checksum injection — required for browser-side presigned PUT uploads
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

const BUCKET = process.env.PORTAL_MEDIA_BUCKET || process.env.AWS_S3_BUCKET || "faderlabs-client-uploads";

export async function generatePresignedUploadUrl(params: {
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const client = getS3Client();
  const region = process.env.AWS_S3_REGION || "us-east-2";
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folder = params.folder || "client-uploads";
  const fileKey = `${folder}/${Date.now()}-${randomSuffix}-${sanitizedName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ContentType: params.contentType,
  });

  // unhoistableHeaders ensures x-amz-checksum-* headers are NOT included in the signed URL
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 3600,
    unhoistableHeaders: new Set(["x-amz-checksum-crc32", "x-amz-sdk-checksum-algorithm"]),
  });
  const publicUrl = `aws-media:${fileKey}`;

  return { uploadUrl, fileKey, publicUrl };
}

// Presigned GET URL with Content-Disposition: attachment — for forced file downloads
export async function generatePresignedDownloadUrl(fileKey: string, originalFileName?: string): Promise<string> {
  const client = getS3Client();
  // Use the original filename if provided; fall back to last segment of the key
  const displayName = originalFileName || fileKey.split("/").pop() || "file";
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename="${displayName}"`,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
}

// Legacy direct URL helper. Isolated AWS code should use presigned URLs for the private media bucket.
export function getPublicUrl(fileKey: string): string {
  const region = process.env.AWS_S3_REGION || "us-east-2";
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${fileKey}`;
}

// Presigned GET URL for streaming (no Content-Disposition) — used for video/audio players
export async function generatePresignedStreamUrl(fileKey: string): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });
  return getSignedUrl(client, command, { expiresIn: 7200 }); // 2 hours for streaming
}
