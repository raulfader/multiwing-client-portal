import { z } from "zod";
import { isMissingProcedure } from "../portal";
import { confirmFlag, defineTool, idSchema, type ToolContext } from "../tool";
import { compactUpdate } from "../util";

export const fileTypeSchema = z
  .enum(["video", "audio", "image", "document", "archive"])
  .describe("Deliverable type used by the portal to choose a player/icon.");

export const reviewStatusSchema = z
  .enum(["pending", "approved", "needs_changes"])
  .describe("Client review status of a deliverable.");

export async function findDeliverable(ctx: ToolContext, deliverableId: number, projectIdHint?: number) {
  try {
    return await ctx.portal.deliverables.byId.query({ id: deliverableId });
  } catch (err) {
    if (!isMissingProcedure(err)) throw err;
    const projectIds = projectIdHint != null
      ? [projectIdHint]
      : (await ctx.portal.projects.listAdmin.query()).map((p) => p.id);
    for (const projectId of projectIds) {
      const match = (await ctx.portal.deliverables.byProject.query({ projectId })).find((d) => d.id === deliverableId);
      if (match) return match;
    }
    throw new Error(`Deliverable ${deliverableId} not found`);
  }
}

/** Creates a deliverable and returns its id, also on backends whose create mutation predates returning ids. */
export async function createDeliverable(
  ctx: ToolContext,
  input: { projectId: number; title: string; description?: string; thumbnailUrl?: string; downloadUrl?: string; fileType?: string; sortOrder?: number }
): Promise<number> {
  const before = input.sortOrder === undefined
    ? await ctx.portal.deliverables.byProject.query({ projectId: input.projectId })
    : undefined;
  const sortOrder = input.sortOrder ?? (before ? before.length : 0);
  const result = await ctx.portal.deliverables.create.mutate({ ...input, sortOrder });
  if (result.id != null) return result.id;
  const rows = await ctx.portal.deliverables.byProject.query({ projectId: input.projectId });
  const newest = rows.filter((d) => d.title === input.title).sort((a, b) => b.id - a.id)[0];
  if (!newest) throw new Error("Deliverable was created but its id could not be determined");
  return newest.id;
}

export const deliverableTools = [
  defineTool({
    name: "list_deliverables",
    title: "List project deliverables",
    description: "List the deliverables (files/links) in a project with review status, file info and transcoding state. Optionally include per-file download counts.",
    readOnly: true,
    inputSchema: {
      projectId: idSchema,
      reviewStatus: reviewStatusSchema.optional().describe("Only return deliverables with this review status."),
      includeDownloadCounts: z.boolean().default(false),
    },
    handler: async ({ projectId, reviewStatus, includeDownloadCounts }, ctx) => {
      const rows = (await ctx.portal.deliverables.byProject.query({ projectId })).filter((d) =>
        reviewStatus ? d.reviewStatus === reviewStatus : true
      );
      if (!includeDownloadCounts || rows.length === 0) return rows;
      const counts = await ctx.portal.deliverables.getDownloadCounts.query({ deliverableIds: rows.map((d) => d.id) });
      return rows.map((d) => ({ ...d, downloadCount: counts[d.id] ?? 0 }));
    },
  }),

  defineTool({
    name: "get_deliverable",
    title: "Get deliverable details",
    description: "Fetch one deliverable with its client comments, transcoding (proxy) status and download count.",
    readOnly: true,
    inputSchema: { deliverableId: idSchema },
    handler: async ({ deliverableId }, ctx) => {
      const deliverable = await findDeliverable(ctx, deliverableId);
      const [comments, proxy, counts] = await Promise.all([
        ctx.portal.deliverableComments.byDeliverable.query({ deliverableId }),
        ctx.portal.deliverables.getProxyStatus.query({ id: deliverableId }),
        ctx.portal.deliverables.getDownloadCounts.query({ deliverableIds: [deliverableId] }),
      ]);
      return { deliverable, comments, transcoding: proxy, downloadCount: counts[deliverableId] ?? 0 };
    },
  }),

  defineTool({
    name: "create_deliverable",
    title: "Create deliverable (link or placeholder)",
    description:
      "Add a deliverable entry to a project without uploading a file, e.g. an external link (Frame.io / OneDrive) or a placeholder to attach a file to later. To upload a local file use upload_file_to_project instead.",
    readOnly: false,
    inputSchema: {
      projectId: idSchema,
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      downloadUrl: z.string().optional().describe("External download / view link."),
      thumbnailUrl: z.string().optional(),
      fileType: fileTypeSchema.default("video"),
      sortOrder: z.number().int().optional().describe("Defaults to the end of the list."),
    },
    handler: async (args, ctx) => {
      const id = await createDeliverable(ctx, args);
      return { success: true, deliverableId: id, deliverable: await findDeliverable(ctx, id, args.projectId) };
    },
  }),

  defineTool({
    name: "update_deliverable",
    title: "Update deliverable metadata",
    description: "Edit a deliverable's title, description, link, thumbnail, type or sort order. Only provided fields change.",
    readOnly: false,
    idempotent: true,
    inputSchema: {
      deliverableId: idSchema,
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      downloadUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      fileType: fileTypeSchema.optional(),
      sortOrder: z.number().int().optional(),
    },
    handler: async ({ deliverableId, ...fields }, ctx) => {
      await ctx.portal.deliverables.update.mutate({ id: deliverableId, ...compactUpdate(fields) });
      return { success: true, deliverable: await findDeliverable(ctx, deliverableId) };
    },
  }),

  defineTool({
    name: "delete_deliverable",
    title: "Delete deliverable",
    description: "Permanently remove a deliverable from its project (the stored S3 object is not deleted).",
    readOnly: false,
    destructive: true,
    inputSchema: { deliverableId: idSchema, confirm: confirmFlag },
    handler: async ({ deliverableId }, ctx) => {
      await ctx.portal.deliverables.delete.mutate({ id: deliverableId });
      return { success: true, deletedDeliverableId: deliverableId };
    },
  }),

  defineTool({
    name: "reorder_deliverables",
    title: "Reorder deliverables",
    description: "Set the display order of deliverables inside a project. Pass deliverable ids in the desired order.",
    readOnly: false,
    idempotent: true,
    inputSchema: { deliverableIds: z.array(idSchema).min(1) },
    handler: async ({ deliverableIds }, ctx) => {
      await ctx.portal.deliverables.reorder.mutate({ items: deliverableIds.map((id, sortOrder) => ({ id, sortOrder })) });
      return { success: true, order: deliverableIds };
    },
  }),

  defineTool({
    name: "get_deliverable_stream_url",
    title: "Get deliverable streaming URL",
    description: "Get a signed, time-limited (2h) URL to play/view a deliverable in a browser. Uses the H.264 proxy when transcoding is ready.",
    readOnly: true,
    inputSchema: { deliverableId: idSchema },
    handler: async ({ deliverableId }, ctx) => ctx.portal.deliverables.getStreamUrl.mutate({ id: deliverableId }),
  }),

  defineTool({
    name: "get_transcoding_status",
    title: "Get transcoding status",
    description: "Check the browser-playback proxy status for a deliverable (none, pending, processing, ready, failed). ProRes/MOV/MXF uploads are transcoded automatically.",
    readOnly: true,
    inputSchema: { deliverableId: idSchema },
    handler: async ({ deliverableId }, ctx) => ctx.portal.deliverables.getProxyStatus.query({ id: deliverableId }),
  }),

  defineTool({
    name: "retranscode_deliverable",
    title: "Re-transcode deliverable",
    description: "Reset the proxy and re-run the AWS transcoder for a deliverable's source file. The existing proxy is replaced (usually 1-5 minutes).",
    readOnly: false,
    inputSchema: { deliverableId: idSchema },
    handler: async ({ deliverableId }, ctx) => {
      await ctx.portal.deliverables.retranscode.mutate({ id: deliverableId });
      return { success: true, deliverableId, next: "Poll get_transcoding_status until status is ready or failed." };
    },
  }),

  defineTool({
    name: "get_download_counts",
    title: "Get download counts",
    description: "Return how many times each deliverable has been downloaded (by clients, guests and the team).",
    readOnly: true,
    inputSchema: { deliverableIds: z.array(idSchema).min(1) },
    handler: async ({ deliverableIds }, ctx) => {
      const counts = await ctx.portal.deliverables.getDownloadCounts.query({ deliverableIds });
      return Object.fromEntries(deliverableIds.map((id) => [id, counts[id] ?? 0]));
    },
  }),
];
