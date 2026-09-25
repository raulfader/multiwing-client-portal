import { z } from "zod";
import { confirmFlag, defineTool, idSchema, requireConfirm, sendConfirmFlag } from "../tool";
import { extractShareToken } from "../util";

const tokenSchema = z.string().min(1).describe("Share token, or the full share link (…/share/<token>).");

export const shareTools = [
  defineTool({
    name: "list_project_shares",
    title: "List project shares",
    description: "Active vendor / third-party access grants for a project (email, access level, share link). Links still require the guest's emailed code to open.",
    readOnly: true,
    inputSchema: { projectId: idSchema },
    handler: async ({ projectId }, ctx) => {
      const rows = await ctx.portal.shares.list.query({ projectId });
      return rows.map((s) => ({ ...s, shareUrl: `${ctx.config.publicUrl}/share/${s.token}` }));
    },
  }),

  defineTool({
    name: "share_project",
    title: "Share project with a guest",
    description:
      'Grant a vendor/guest email access to one project and email them an invite link. "read" = view only, "download" = view and download files. Re-sharing to the same email updates the access level. Requires confirm=true.',
    readOnly: false,
    inputSchema: {
      projectId: idSchema,
      email: z.string().email(),
      accessLevel: z.enum(["read", "download"]).default("read"),
      confirm: sendConfirmFlag,
    },
    handler: async ({ projectId, email, accessLevel, confirm }, ctx) => {
      requireConfirm(confirm, `Granting ${accessLevel} access to ${email} and emailing an invite`);
      return ctx.portal.shares.create.mutate({ projectId, email, accessLevel, origin: ctx.config.publicUrl });
    },
  }),

  defineTool({
    name: "revoke_project_share",
    title: "Revoke project share",
    description: "Revoke a guest's access to a project immediately. The share cannot be re-activated; share again to restore access.",
    readOnly: false,
    destructive: true,
    idempotent: true,
    inputSchema: { shareId: idSchema, confirm: confirmFlag },
    handler: async ({ shareId }, ctx) => {
      await ctx.portal.shares.revoke.mutate({ shareId });
      return { success: true, revokedShareId: shareId };
    },
  }),

  defineTool({
    name: "check_share_link",
    title: "Check share link",
    description: "Check whether a share link is still valid and which project, guest email and access level it grants.",
    readOnly: true,
    inputSchema: { token: tokenSchema },
    handler: async ({ token }, ctx) => ctx.portal.shares.checkToken.query({ token: extractShareToken(token) }),
  }),

  defineTool({
    name: "resend_share_verification_code",
    title: "Resend guest verification code",
    description:
      "Email a fresh 6-digit sign-in code to a guest for their share link (valid 15 minutes). The email must match the invited address. Requires confirm=true.",
    readOnly: false,
    inputSchema: { token: tokenSchema, email: z.string().email(), confirm: sendConfirmFlag },
    handler: async ({ token, email, confirm }, ctx) => {
      requireConfirm(confirm, `Emailing a sign-in code to ${email}`);
      return ctx.portal.shares.requestOtp.mutate({ token: extractShareToken(token), email, origin: ctx.config.publicUrl });
    },
  }),
];
