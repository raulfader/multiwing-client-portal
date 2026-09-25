import { z } from "zod";
import { guessContentType, normalizeContentType, putFileToPresignedUrl, resolveReadableFile } from "../files";
import { confirmFlag, defineTool, idSchema, type ToolContext } from "../tool";
import { saveSignedUrl, saveToSchema, urlOnlySchema } from "./files";

const requestStatusSchema = z.enum(["new", "in_review", "completed"]);

type RequestFile = { name: string; url: string; key: string; size: number; type: string };

async function findRequest(ctx: ToolContext, requestId: number) {
  const request = (await ctx.portal.clientRequests.list.query()).find((r) => r.id === requestId);
  if (!request) throw new Error(`Client request ${requestId} not found`);
  return { ...request, files: request.files as RequestFile[] };
}

export const clientRequestTools = [
  defineTool({
    name: "list_client_requests",
    title: "List client project requests",
    description: "New-project requests submitted by clients through the portal's request form, newest first, with attached files.",
    readOnly: true,
    inputSchema: { status: requestStatusSchema.optional() },
    handler: async ({ status }, ctx) =>
      (await ctx.portal.clientRequests.list.query()).filter((r) => (status ? r.status === status : true)),
  }),

  defineTool({
    name: "update_client_request",
    title: "Update client request status",
    description: "Move a client request between new, in_review and completed, and/or edit the internal admin notes (existing notes are kept unless replaced).",
    readOnly: false,
    idempotent: true,
    inputSchema: {
      requestId: idSchema,
      status: requestStatusSchema.optional(),
      adminNotes: z.string().optional(),
    },
    handler: async ({ requestId, status, adminNotes }, ctx) => {
      const current = await findRequest(ctx, requestId);
      await ctx.portal.clientRequests.updateStatus.mutate({
        id: requestId,
        status: status ?? current.status,
        adminNotes: adminNotes ?? current.adminNotes ?? undefined,
      });
      return { success: true, request: await findRequest(ctx, requestId) };
    },
  }),

  defineTool({
    name: "delete_client_request",
    title: "Delete client request",
    description: "Permanently delete a client project request.",
    readOnly: false,
    destructive: true,
    inputSchema: { requestId: idSchema, confirm: confirmFlag },
    handler: async ({ requestId }, ctx) => {
      await ctx.portal.clientRequests.delete.mutate({ id: requestId });
      return { success: true, deletedRequestId: requestId };
    },
  }),

  defineTool({
    name: "download_client_request_files",
    title: "Download client request files",
    description: "Download the files a client attached to a project request (all files, or one by name/key), or return signed URLs with urlOnly.",
    readOnly: true,
    inputSchema: {
      requestId: idSchema,
      file: z.string().optional().describe("File name or S3 key to download. Defaults to all attached files."),
      saveTo: saveToSchema,
      urlOnly: urlOnlySchema,
    },
    handler: async ({ requestId, file, saveTo, urlOnly }, ctx) => {
      const request = await findRequest(ctx, requestId);
      const files = file ? request.files.filter((f) => f.name === file || f.key === file) : request.files;
      if (files.length === 0) throw new Error(file ? `No file "${file}" on request ${requestId}` : `Request ${requestId} has no files`);
      const results = [];
      for (const f of files) {
        const { url } = await ctx.portal.clientRequests.getDownloadUrl.mutate({ fileKey: f.key });
        results.push(
          urlOnly
            ? { name: f.name, url, expiresInSeconds: 3600 }
            : { name: f.name, ...(await saveSignedUrl(ctx, url, f.name, saveTo ?? `${ctx.config.downloadDir}/request-${requestId}/`)) }
        );
      }
      return { requestId, files: results };
    },
  }),

  defineTool({
    name: "submit_client_request",
    title: "Submit a project request on a client's behalf",
    description:
      "Log a new project request exactly as if the client used the portal's request form (optionally uploading local files). Emails the Faderlabs team like a normal submission.",
    readOnly: false,
    inputSchema: {
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      submitterName: z.string().min(1).max(200),
      submitterEmail: z.string().email(),
      filePaths: z.array(z.string().min(1)).default([]).describe("Local files to attach."),
    },
    handler: async ({ filePaths, ...request }, ctx) => {
      const files: RequestFile[] = [];
      for (const p of filePaths) {
        const file = await resolveReadableFile(p, ctx.config);
        const type = normalizeContentType(guessContentType(file.name));
        const { uploadUrl, fileKey, publicUrl } = await ctx.portal.clientRequests.getUploadUrl.mutate({ fileName: file.name, contentType: type });
        await putFileToPresignedUrl(uploadUrl, file.path, type, file.size);
        files.push({ name: file.name, url: publicUrl, key: fileKey, size: file.size, type });
      }
      await ctx.portal.clientRequests.submit.mutate({ ...request, files });
      return { success: true, filesUploaded: files.length };
    },
  }),
];
