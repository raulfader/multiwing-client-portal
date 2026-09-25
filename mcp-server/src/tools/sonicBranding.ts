import { z } from "zod";
import { guessContentType, normalizeContentType, putFileToPresignedUrl, resolveReadableFile } from "../files";
import { confirmFlag, defineTool, idSchema } from "../tool";
import { compactUpdate, stripExtension } from "../util";
import { saveSignedUrl, saveToSchema, urlOnlySchema } from "./files";

export const sonicBrandingTools = [
  defineTool({
    name: "list_pillars",
    title: "List sonic-branding pillars",
    description: "Sonic-branding proposal pillars in display order, optionally with their audio tracks.",
    readOnly: true,
    inputSchema: { includeTracks: z.boolean().default(true) },
    handler: async ({ includeTracks }, ctx) => {
      const pillars = await ctx.portal.pillars.list.query();
      if (!includeTracks) return pillars;
      const tracks = await ctx.portal.tracks.allWithPillars.query();
      return pillars.map((p) => ({ ...p, tracks: tracks.filter((t) => t.pillarId === p.id) }));
    },
  }),

  defineTool({
    name: "create_pillar",
    title: "Create pillar",
    description: "Add a sonic-branding pillar (a themed group of tracks).",
    readOnly: false,
    inputSchema: {
      title: z.string().min(1),
      description: z.string().optional(),
      sortOrder: z.number().int().optional(),
    },
    handler: async (args, ctx) => ctx.portal.pillars.create.mutate(args),
  }),

  defineTool({
    name: "update_pillar",
    title: "Update pillar",
    description: "Edit a pillar's title, description or sort order.",
    readOnly: false,
    idempotent: true,
    inputSchema: {
      pillarId: idSchema,
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      sortOrder: z.number().int().optional(),
    },
    handler: async ({ pillarId, ...fields }, ctx) => {
      await ctx.portal.pillars.update.mutate({ id: pillarId, ...compactUpdate(fields) });
      return { success: true, pillar: await ctx.portal.pillars.get.query({ id: pillarId }) };
    },
  }),

  defineTool({
    name: "delete_pillar",
    title: "Delete pillar",
    description: "Permanently delete a sonic-branding pillar.",
    readOnly: false,
    destructive: true,
    inputSchema: { pillarId: idSchema, confirm: confirmFlag },
    handler: async ({ pillarId }, ctx) => {
      await ctx.portal.pillars.delete.mutate({ id: pillarId });
      return { success: true, deletedPillarId: pillarId };
    },
  }),

  defineTool({
    name: "list_tracks",
    title: "List sonic-branding tracks",
    description: "Audio tracks for one pillar, or all tracks across pillars.",
    readOnly: true,
    inputSchema: { pillarId: idSchema.optional() },
    handler: async ({ pillarId }, ctx) =>
      pillarId != null ? ctx.portal.tracks.byPillar.query({ pillarId }) : ctx.portal.tracks.allWithPillars.query(),
  }),

  defineTool({
    name: "upload_track",
    title: "Upload sonic-branding track",
    description: "Upload a local audio file (WAV, MP3, …) as a new track in a pillar, using the same presigned-S3 flow as the admin UI.",
    readOnly: false,
    inputSchema: {
      pillarId: idSchema,
      filePath: z.string().min(1),
      title: z.string().min(1).optional().describe("Defaults to the file name without extension."),
      description: z.string().optional(),
      durationSeconds: z.number().int().positive().optional(),
      sortOrder: z.number().int().optional().describe("Defaults to the end of the pillar."),
    },
    handler: async (args, ctx) => {
      const file = await resolveReadableFile(args.filePath, ctx.config);
      const guessed = guessContentType(file.name);
      const contentType = normalizeContentType(guessed === "application/octet-stream" ? "audio/mpeg" : guessed);
      const { uploadUrl, fileKey, publicUrl } = await ctx.portal.tracks.getUploadUrl.mutate({
        pillarId: args.pillarId,
        fileName: file.name,
        contentType,
      });
      await putFileToPresignedUrl(uploadUrl, file.path, contentType, file.size);
      const created = await ctx.portal.tracks.create.mutate({
        pillarId: args.pillarId,
        title: args.title ?? stripExtension(file.name),
        description: args.description,
        audioUrl: publicUrl,
        audioKey: fileKey,
        durationSeconds: args.durationSeconds,
        sortOrder: args.sortOrder,
      });
      return { success: true, trackId: created.id ?? null, fileKey, fileSize: file.size };
    },
  }),

  defineTool({
    name: "delete_track",
    title: "Delete track",
    description: "Permanently remove a sonic-branding track.",
    readOnly: false,
    destructive: true,
    inputSchema: { trackId: idSchema, confirm: confirmFlag },
    handler: async ({ trackId }, ctx) => {
      await ctx.portal.tracks.delete.mutate({ id: trackId });
      return { success: true, deletedTrackId: trackId };
    },
  }),

  defineTool({
    name: "download_track",
    title: "Download track audio",
    description: "Download a sonic-branding track's audio file locally, or return a signed URL with urlOnly.",
    readOnly: true,
    inputSchema: { trackId: idSchema, saveTo: saveToSchema, urlOnly: urlOnlySchema },
    handler: async ({ trackId, saveTo, urlOnly }, ctx) => {
      const { url, fileName } = await ctx.portal.tracks.getDownloadUrl.mutate({ id: trackId });
      if (urlOnly) return { trackId, fileName, url, expiresInSeconds: 3600 };
      return { trackId, fileName, ...(await saveSignedUrl(ctx, url, fileName, saveTo)) };
    },
  }),

  defineTool({
    name: "get_track_stream_url",
    title: "Get track streaming URL",
    description: "Signed, time-limited (2h) URL for playing a track in a browser.",
    readOnly: true,
    inputSchema: { trackId: idSchema },
    handler: async ({ trackId }, ctx) => ctx.portal.tracks.getStreamUrl.mutate({ id: trackId }),
  }),

  defineTool({
    name: "get_sonic_branding_settings",
    title: "Get sonic-branding page text",
    description: "Hero title and subtitle shown on the client's sonic-branding proposal page.",
    readOnly: true,
    inputSchema: {},
    handler: async (_args, ctx) => ctx.portal.sonicBrandingSettings.get.query(),
  }),

  defineTool({
    name: "update_sonic_branding_settings",
    title: "Update sonic-branding page text",
    description: "Edit the hero title and/or subtitle on the sonic-branding proposal page.",
    readOnly: false,
    idempotent: true,
    inputSchema: {
      heroTitle: z.string().min(1).max(200).optional(),
      heroSubtitle: z.string().max(500).optional(),
    },
    handler: async (fields, ctx) => {
      await ctx.portal.sonicBrandingSettings.update.mutate(compactUpdate(fields));
      return { success: true, settings: await ctx.portal.sonicBrandingSettings.get.query() };
    },
  }),
];
