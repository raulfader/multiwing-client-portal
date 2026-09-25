import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  detectFileType,
  downloadUrlToFile,
  guessContentType,
  normalizeContentType,
  putFileToPresignedUrl,
  resolveDownloadDir,
  resolveDownloadTarget,
  resolveReadableFile,
  sanitizeFileName,
} from "../files";
import { defineTool, idSchema, type ToolContext } from "../tool";
import { stripExtension } from "../util";
import { createDeliverable, fileTypeSchema, findDeliverable, reviewStatusSchema } from "./deliverables";
import { findProject } from "./projects";

const PROXY_EXTENSIONS = new Set(["mov", "prores", "mxf", "dnxhd"]);
/** Express on the portal accepts 50 MB JSON bodies; base64 adds ~33%. */
const MAX_INLINE_IMAGE_BYTES = 36 * 1024 * 1024;

const saveToSchema = z
  .string()
  .optional()
  .describe("Local directory or file path to save to. Defaults to MULTIWING_DOWNLOAD_DIR (~/Downloads/multiwing).");
const urlOnlySchema = z
  .boolean()
  .default(false)
  .describe("Return a signed download URL (valid ~1h) instead of saving the file locally.");

async function saveSignedUrl(ctx: ToolContext, url: string, fileName: string, saveTo?: string) {
  const target = await resolveDownloadTarget(saveTo, fileName, ctx.config);
  const bytes = await downloadUrlToFile(url, target, ctx.fetch);
  return { savedTo: target, bytes };
}

async function uploadToDeliverable(
  ctx: ToolContext,
  file: { path: string; size: number; name: string },
  deliverableId: number,
  contentType: string,
  fileType?: string
) {
  const { uploadUrl, fileKey, publicUrl } = await ctx.portal.deliverables.getUploadUrl.mutate({
    fileName: file.name,
    contentType,
    deliverableId,
  });
  await putFileToPresignedUrl(uploadUrl, file.path, contentType, file.size);
  await ctx.portal.deliverables.update.mutate({
    id: deliverableId,
    fileKey,
    fileName: file.name,
    fileSize: file.size,
    downloadUrl: publicUrl,
    fileType: fileType ?? detectFileType(contentType),
  });
  return fileKey;
}

export const fileTools = [
  defineTool({
    name: "upload_file_to_project",
    title: "Upload file to project",
    description:
      "Upload a local file to a project as a deliverable, using the same presigned-S3 flow as the admin UI (any size). Creates a new deliverable unless deliverableId is given, in which case that deliverable's file is replaced. MOV/ProRes/MXF files are queued for browser-proxy transcoding automatically.",
    readOnly: false,
    inputSchema: {
      projectId: idSchema,
      filePath: z.string().min(1).describe("Absolute path of the local file to upload."),
      title: z.string().min(1).max(255).optional().describe("Deliverable title. Defaults to the file name without extension."),
      description: z.string().optional(),
      deliverableId: idSchema.optional().describe("Attach to / replace the file of an existing deliverable instead of creating one."),
      fileType: fileTypeSchema.optional().describe("Defaults to a type detected from the MIME type."),
      contentType: z.string().optional().describe("MIME type override. Detected from the file extension by default."),
      thumbnailUrl: z.string().optional(),
    },
    handler: async (args, ctx) => {
      const file = await resolveReadableFile(args.filePath, ctx.config);
      const contentType = normalizeContentType(args.contentType ?? guessContentType(file.name));
      let deliverableId = args.deliverableId;
      const created = deliverableId == null;

      if (deliverableId == null) {
        await findProject(ctx, { projectId: args.projectId });
        deliverableId = await createDeliverable(ctx, {
          projectId: args.projectId,
          title: args.title ?? stripExtension(file.name),
          description: args.description,
          thumbnailUrl: args.thumbnailUrl,
          fileType: args.fileType ?? detectFileType(contentType),
        });
      } else {
        const existing = await findDeliverable(ctx, deliverableId, args.projectId);
        if (existing.projectId !== args.projectId) {
          throw new Error(`Deliverable ${deliverableId} belongs to project ${existing.projectId}, not ${args.projectId}`);
        }
        if (args.title || args.description || args.thumbnailUrl) {
          await ctx.portal.deliverables.update.mutate({
            id: deliverableId,
            title: args.title,
            description: args.description,
            thumbnailUrl: args.thumbnailUrl,
          });
        }
      }

      let fileKey: string;
      try {
        fileKey = await uploadToDeliverable(ctx, file, deliverableId, contentType, args.fileType);
      } catch (err) {
        if (created) await ctx.portal.deliverables.delete.mutate({ id: deliverableId }).catch(() => undefined);
        throw err;
      }

      const ext = path.extname(file.name).slice(1).toLowerCase();
      return {
        success: true,
        deliverableId,
        created,
        fileKey,
        fileName: file.name,
        fileSize: file.size,
        contentType,
        transcoding: PROXY_EXTENSIONS.has(ext)
          ? "pending: a browser-playback proxy will be generated; check get_transcoding_status"
          : "not required",
      };
    },
  }),

  defineTool({
    name: "create_upload_url",
    title: "Create presigned upload URL",
    description:
      "Get a presigned S3 PUT URL (valid 1h) for uploading a file yourself, e.g. from another machine. PUT the raw bytes with the returned Content-Type header, then call attach_uploaded_file.",
    readOnly: false,
    inputSchema: {
      fileName: z.string().min(1),
      contentType: z.string().optional(),
      deliverableId: idSchema.optional().describe("Embed the deliverable id in the S3 key so the transcoder can find it (recommended)."),
    },
    handler: async ({ fileName, contentType, deliverableId }, ctx) => {
      const type = normalizeContentType(contentType ?? guessContentType(fileName));
      const result = await ctx.portal.deliverables.getUploadUrl.mutate({ fileName, contentType: type, deliverableId });
      return { ...result, method: "PUT", headers: { "Content-Type": type }, expiresInSeconds: 3600 };
    },
  }),

  defineTool({
    name: "attach_uploaded_file",
    title: "Attach uploaded file to deliverable",
    description: "Record a file already uploaded via create_upload_url on a deliverable (sets file key, name, size, type and download reference).",
    readOnly: false,
    idempotent: true,
    inputSchema: {
      deliverableId: idSchema,
      fileKey: z.string().min(1),
      fileName: z.string().min(1),
      fileSize: z.number().int().nonnegative().optional(),
      fileType: fileTypeSchema.optional(),
      contentType: z.string().optional(),
    },
    handler: async (args, ctx) => {
      const type = normalizeContentType(args.contentType ?? guessContentType(args.fileName));
      await ctx.portal.deliverables.update.mutate({
        id: args.deliverableId,
        fileKey: args.fileKey,
        fileName: args.fileName,
        fileSize: args.fileSize ?? null,
        downloadUrl: `aws-media:${args.fileKey}`,
        fileType: args.fileType ?? detectFileType(type),
      });
      return { success: true, deliverable: await findDeliverable(ctx, args.deliverableId) };
    },
  }),

  defineTool({
    name: "download_deliverable_file",
    title: "Download deliverable file",
    description:
      "Download a deliverable's file from a project to the local machine (or return a signed URL with urlOnly). Deliverables that only have an external link return that link instead. Downloads are logged in the portal's activity log like UI downloads.",
    readOnly: true,
    inputSchema: { deliverableId: idSchema, saveTo: saveToSchema, urlOnly: urlOnlySchema },
    handler: async ({ deliverableId, saveTo, urlOnly }, ctx) => {
      let signed: { url: string; fileName?: string };
      try {
        signed = await ctx.portal.deliverables.getDownloadUrl.mutate({ id: deliverableId });
      } catch (err) {
        if (!(err instanceof Error) || !/No file attached/i.test(err.message)) throw err;
        const d = await findDeliverable(ctx, deliverableId);
        if (d.downloadUrl && !d.downloadUrl.startsWith("aws-media:")) {
          return { deliverableId, externalUrl: d.downloadUrl, note: "This deliverable is an external link, not a stored file." };
        }
        throw err;
      }
      const fileName = signed.fileName ?? `deliverable-${deliverableId}`;
      if (urlOnly) return { deliverableId, fileName, url: signed.url, expiresInSeconds: 3600 };
      return { deliverableId, fileName, ...(await saveSignedUrl(ctx, signed.url, fileName, saveTo)) };
    },
  }),

  defineTool({
    name: "download_project_files",
    title: "Download all project files",
    description: "Download every stored file in a project into a local folder (<saveTo>/<project-slug>/). External-link deliverables are listed rather than downloaded.",
    readOnly: true,
    inputSchema: {
      projectId: idSchema,
      saveTo: z.string().optional().describe("Parent directory. Defaults to MULTIWING_DOWNLOAD_DIR."),
      reviewStatus: reviewStatusSchema.optional().describe("Only download deliverables with this review status (e.g. approved)."),
    },
    handler: async ({ projectId, saveTo, reviewStatus }, ctx) => {
      const project = await findProject(ctx, { projectId });
      const dir = await resolveDownloadDir(path.join(saveTo ?? ctx.config.downloadDir, sanitizeFileName(project.slug)), ctx.config);
      const rows = (await ctx.portal.deliverables.byProject.query({ projectId })).filter((d) =>
        reviewStatus ? d.reviewStatus === reviewStatus : true
      );
      const used = new Set<string>();
      const downloaded: unknown[] = [];
      const links: unknown[] = [];
      const failed: unknown[] = [];
      for (const d of rows) {
        if (!d.fileKey) {
          if (d.downloadUrl) links.push({ deliverableId: d.id, title: d.title, url: d.downloadUrl });
          continue;
        }
        try {
          const signed = await ctx.portal.deliverables.getDownloadUrl.mutate({ id: d.id });
          let name = sanitizeFileName(signed.fileName ?? d.fileName ?? `deliverable-${d.id}`);
          if (used.has(name)) name = `${d.id}-${name}`;
          used.add(name);
          downloaded.push({ deliverableId: d.id, title: d.title, ...(await saveSignedUrl(ctx, signed.url, name, path.join(dir, name))) });
        } catch (err) {
          failed.push({ deliverableId: d.id, title: d.title, error: err instanceof Error ? err.message : String(err) });
        }
      }
      return { project: { id: project.id, title: project.title }, directory: dir, downloaded, externalLinks: links, failed };
    },
  }),

  defineTool({
    name: "upload_image",
    title: "Upload image (cover / thumbnail)",
    description:
      "Upload a local image to portal storage and return its URL. Optionally set it directly as a project's cover image or a deliverable's thumbnail.",
    readOnly: false,
    inputSchema: {
      filePath: z.string().min(1),
      folder: z.enum(["project-covers", "deliverable-thumbnails", "images"]).default("images"),
      setAsProjectCover: idSchema.optional().describe("Project id whose coverImageUrl should be set to the uploaded image."),
      setAsDeliverableThumbnail: idSchema.optional().describe("Deliverable id whose thumbnailUrl should be set to the uploaded image."),
    },
    handler: async ({ filePath, folder, setAsProjectCover, setAsDeliverableThumbnail }, ctx) => {
      const file = await resolveReadableFile(filePath, ctx.config);
      const contentType = guessContentType(file.name);
      if (!contentType.startsWith("image/")) throw new Error(`Not an image file: ${file.name}`);
      if (file.size > MAX_INLINE_IMAGE_BYTES) throw new Error("Image is too large for the portal image upload (max ~36 MB).");
      const fileBase64 = (await fs.readFile(file.path)).toString("base64");
      const { url, key } = await ctx.portal.uploadImage.upload.mutate({ filename: file.name, contentType, fileBase64, folder });
      if (setAsProjectCover) await ctx.portal.projects.update.mutate({ id: setAsProjectCover, coverImageUrl: url });
      if (setAsDeliverableThumbnail) await ctx.portal.deliverables.update.mutate({ id: setAsDeliverableThumbnail, thumbnailUrl: url });
      return { success: true, url, key };
    },
  }),
];

export { saveSignedUrl, saveToSchema, urlOnlySchema };
