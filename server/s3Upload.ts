import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

function getS3Client() {
  const region = process.env.AWS_S3_REGION || "us-east-2";
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = process.env.AWS_S3_BUCKET || "faderlabs-client-uploads";

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

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
  const publicUrl = `https://${BUCKET}.s3.${region}.amazonaws.com/${fileKey}`;

  return { uploadUrl, fileKey, publicUrl };
}

export async function generatePresignedDownloadUrl(fileKey: string): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename="${fileKey.split("/").pop()}"`,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
}
