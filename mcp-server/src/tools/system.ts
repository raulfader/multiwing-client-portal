import { z } from "zod";
import { defineTool, idSchema } from "../tool";
import { parseSince, sinceSchema } from "../util";

export const systemTools = [
  defineTool({
    name: "whoami",
    title: "Check portal connection",
    description: "Show which portal this MCP server talks to, how it authenticates, and the role of the current session (should be admin).",
    readOnly: true,
    inputSchema: {},
    handler: async (_args, ctx) => {
      const session = await ctx.portal.auth.me.query();
      return {
        apiUrl: ctx.config.apiUrl,
        publicUrl: ctx.config.publicUrl,
        authMode: ctx.config.authMode,
        readOnly: ctx.config.readOnly,
        session,
        ok: session?.role === "admin",
      };
    },
  }),

  defineTool({
    name: "health_check",
    title: "Portal health check",
    description: "Ping the portal API.",
    readOnly: true,
    inputSchema: {},
    handler: async (_args, ctx) => ctx.portal.system.health.query({ timestamp: Date.now() }),
  }),

  defineTool({
    name: "list_activity",
    title: "List activity log",
    description: "Recent portal activity (client/guest comments and file downloads), newest first. This is the feed behind the 6-hour digest email.",
    readOnly: true,
    inputSchema: {
      since: sinceSchema.optional(),
      eventType: z.enum(["comment", "download"]).optional(),
      deliverableId: idSchema.optional(),
      limit: z.number().int().min(1).max(1000).default(100),
    },
    handler: async ({ since, eventType, deliverableId, limit }, ctx) =>
      ctx.portal.ops.activity.query({ since: parseSince(since), eventType, deliverableId, limit }),
  }),

  defineTool({
    name: "search_hub",
    title: "Search the content hub",
    description: "Search projects, deliverables, comments, tracks, contacts and client requests by text (case-insensitive substring match).",
    readOnly: true,
    inputSchema: {
      query: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(100).default(10).describe("Max results per category."),
    },
    handler: async ({ query, limit }, ctx) => ctx.portal.ops.search.query({ query, limit }),
  }),

  defineTool({
    name: "send_activity_digest",
    title: "Send activity digest now",
    description: "Email the admin digest of the last 6 hours of comments and downloads immediately (normally sent by the scheduled job). Does nothing if there was no activity.",
    readOnly: false,
    inputSchema: {},
    handler: async (_args, ctx) => ctx.portal.system.sendDigest.mutate(),
  }),

  defineTool({
    name: "notify_owner",
    title: "Send owner notification",
    description: "Push a notification to the portal owner's notification feed.",
    readOnly: false,
    inputSchema: {
      title: z.string().min(1).max(1200),
      content: z.string().min(1).max(20000),
    },
    handler: async (args, ctx) => ctx.portal.system.notifyOwner.mutate(args),
  }),
];
