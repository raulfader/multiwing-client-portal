import { z } from "zod";
import { defineTool, idSchema } from "../tool";

const sessionNote =
  "Portal sessions are shared (no per-person user ids), so this records the same approval slot the client uses in the portal and overwrites it.";

export const approvalTools = [
  defineTool({
    name: "list_track_approvals",
    title: "List track approvals",
    description: "Sonic-branding per-track decisions (approved / needs_changes / rejected / pending), for one track or all tracks.",
    readOnly: true,
    inputSchema: { trackId: idSchema.optional() },
    handler: async ({ trackId }, ctx) =>
      trackId != null ? ctx.portal.trackApprovals.byTrack.query({ trackId }) : ctx.portal.trackApprovals.all.query(),
  }),

  defineTool({
    name: "set_track_approval",
    title: "Set track approval",
    description: `Record a decision on a sonic-branding track. ${sessionNote}`,
    readOnly: false,
    idempotent: true,
    inputSchema: { trackId: idSchema, status: z.enum(["approved", "needs_changes", "rejected", "pending"]) },
    handler: async ({ trackId, status }, ctx) => {
      await ctx.portal.trackApprovals.set.mutate({ trackId, status });
      return { success: true, trackId, status };
    },
  }),

  defineTool({
    name: "list_pillar_approvals",
    title: "List pillar approvals (legacy)",
    description: "Legacy per-pillar approvals from the original sonic-branding proposal, for one pillar or all.",
    readOnly: true,
    inputSchema: { pillarId: idSchema.optional() },
    handler: async ({ pillarId }, ctx) =>
      pillarId != null ? ctx.portal.approvals.byPillar.query({ pillarId }) : ctx.portal.approvals.all.query(),
  }),

  defineTool({
    name: "set_pillar_approval",
    title: "Set pillar approval (legacy)",
    description: `Record a legacy per-pillar decision with an optional note. ${sessionNote}`,
    readOnly: false,
    idempotent: true,
    inputSchema: {
      pillarId: idSchema,
      status: z.enum(["approved", "rejected", "pending"]),
      note: z.string().optional(),
    },
    handler: async ({ pillarId, status, note }, ctx) => {
      await ctx.portal.approvals.set.mutate({ pillarId, status, note });
      return { success: true, pillarId, status };
    },
  }),
];
