import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getActivityLog, getCommentInbox, getReviewSummary, searchHub } from "../db";

/**
 * Cross-project, read-only admin views. They back the Faderlabs MCP server
 * (mcp-server/) and are equally usable from the admin UI.
 */
export const opsRouter = router({
  commentInbox: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["open", "unanswered", "resolved", "all"]).optional(),
          source: z.enum(["deliverables", "tracks", "all"]).optional(),
          projectId: z.number().int().optional(),
          since: z.date().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(({ input }) => getCommentInbox(input ?? {})),

  reviewSummary: adminProcedure
    .input(z.object({ projectId: z.number().int().optional() }).optional())
    .query(({ input }) => getReviewSummary(input?.projectId)),

  activity: adminProcedure
    .input(
      z
        .object({
          since: z.date().optional(),
          eventType: z.enum(["comment", "download"]).optional(),
          deliverableId: z.number().int().optional(),
          limit: z.number().int().min(1).max(1000).optional(),
        })
        .optional()
    )
    .query(({ input }) => getActivityLog(input ?? {})),

  search: adminProcedure
    .input(
      z.object({
        query: z.string().trim().min(1).max(200),
        limit: z.number().int().min(1).max(100).optional(),
      })
    )
    .query(({ input }) => searchHub(input.query, input.limit)),
});
