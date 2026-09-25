import { z } from "zod";
import { confirmFlag, defineTool, idSchema, requireConfirm, sendConfirmFlag, type ToolContext } from "../tool";
import { findProject, projectUrl } from "./projects";

const contactIdsSchema = z
  .array(idSchema)
  .optional()
  .describe("Only email these contact ids. Defaults to every contact on the project.");

async function resolveRecipients(ctx: ToolContext, projectId: number, contactIds?: number[]) {
  const contacts = await ctx.portal.contacts.list.query({ projectId });
  const targets = contactIds?.length ? contacts.filter((c) => contactIds.includes(c.id)) : contacts;
  if (targets.length === 0) {
    throw new Error(
      contacts.length === 0
        ? `Project ${projectId} has no email contacts yet. Add one with add_project_contact.`
        : "None of the given contactIds belong to this project."
    );
  }
  return targets;
}

async function send(ctx: ToolContext, input: { projectId: number; subject: string; customMessage?: string; contactIds?: number[] }) {
  const { results } = await ctx.portal.email.sendNotification.mutate(input);
  return {
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

export const notificationTools = [
  defineTool({
    name: "list_project_contacts",
    title: "List project contacts",
    description: "Email recipients configured for a project's notifications.",
    readOnly: true,
    inputSchema: { projectId: idSchema },
    handler: async ({ projectId }, ctx) => ctx.portal.contacts.list.query({ projectId }),
  }),

  defineTool({
    name: "add_project_contact",
    title: "Add project contact",
    description: "Add an email recipient to a project's notification list.",
    readOnly: false,
    inputSchema: {
      projectId: idSchema,
      firstName: z.string().min(1).max(100),
      lastName: z.string().max(100).optional(),
      email: z.string().email(),
    },
    handler: async (args, ctx) => {
      await ctx.portal.contacts.add.mutate(args);
      const contacts = await ctx.portal.contacts.list.query({ projectId: args.projectId });
      return { success: true, contact: contacts.filter((c) => c.email === args.email).at(-1) };
    },
  }),

  defineTool({
    name: "remove_project_contact",
    title: "Remove project contact",
    description: "Remove an email recipient from a project (their email history is kept).",
    readOnly: false,
    destructive: true,
    inputSchema: { contactId: idSchema, confirm: confirmFlag },
    handler: async ({ contactId }, ctx) => {
      await ctx.portal.contacts.delete.mutate({ id: contactId });
      return { success: true, removedContactId: contactId };
    },
  }),

  defineTool({
    name: "send_project_notification",
    title: "Send project email",
    description:
      "Send the branded Faderlabs project email (with the project link, login password and open/click tracking) to a project's contacts. Same as Compose Notification in the admin UI. Note: the server template prints a hard-coded client password, not PORTAL_PASSWORD, so it is wrong if the password was rotated. Requires confirm=true.",
    readOnly: false,
    inputSchema: {
      projectId: idSchema,
      subject: z.string().min(1).optional().describe('Defaults to "Your <project> is ready for review".'),
      message: z.string().optional().describe("Custom message body (HTML allowed). Defaults to the standard ready-for-review text."),
      contactIds: contactIdsSchema,
      confirm: sendConfirmFlag,
    },
    handler: async ({ projectId, subject, message, contactIds, confirm }, ctx) => {
      const project = await findProject(ctx, { projectId });
      await resolveRecipients(ctx, projectId, contactIds);
      requireConfirm(confirm, "Emailing project contacts");
      return send(ctx, {
        projectId,
        subject: subject ?? `Your ${project.title} is ready for review`,
        customMessage: message,
        contactIds,
      });
    },
  }),

  defineTool({
    name: "notify_project_finished",
    title: "Mark project finished and notify client",
    description:
      "Finish a project: set its status to Completed and email the project's contacts that final deliverables are ready. Run with dryRun=true first to preview recipients and copy; sending requires confirm=true. The email includes the server template's hard-coded client password (see send_project_notification).",
    readOnly: false,
    inputSchema: {
      projectId: idSchema,
      subject: z.string().min(1).optional().describe('Defaults to "Your <project> is complete".'),
      message: z.string().optional().describe("Custom message body (HTML allowed)."),
      contactIds: contactIdsSchema,
      markCompleted: z.boolean().default(true).describe("Set the project status to completed before emailing."),
      dryRun: z.boolean().default(false),
      confirm: sendConfirmFlag,
    },
    handler: async ({ projectId, subject, message, contactIds, markCompleted, dryRun, confirm }, ctx) => {
      const project = await findProject(ctx, { projectId });
      const recipients = await resolveRecipients(ctx, projectId, contactIds);
      const email = {
        subject: subject ?? `Your ${project.title} is complete`,
        message:
          message ??
          `Great news: <strong style="color:#ffffff;">${project.title}</strong> is complete and your final deliverables are ready in your project portal. Click below to review and download them.`,
      };
      const willMarkCompleted = markCompleted && project.projectStatus !== "completed";

      if (dryRun) {
        return {
          dryRun: true,
          project: { id: project.id, title: project.title, status: project.projectStatus },
          portalUrl: projectUrl(ctx.config, project.slug),
          willMarkCompleted,
          recipients: recipients.map((c) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" "), email: c.email })),
          ...email,
        };
      }

      requireConfirm(confirm, "Completing the project and emailing its contacts");
      if (willMarkCompleted) await ctx.portal.projects.setStatus.mutate({ id: projectId, status: "completed" });
      try {
        const delivery = await send(ctx, {
          projectId,
          subject: email.subject,
          customMessage: email.message,
          contactIds: recipients.map((c) => c.id),
        });
        return { success: delivery.failed === 0, markedCompleted: willMarkCompleted, ...delivery };
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(willMarkCompleted ? `Project was marked completed, but sending the email failed: ${reason}` : reason);
      }
    },
  }),

  defineTool({
    name: "get_email_log",
    title: "Get email log and tracking",
    description: "Sent-notification history with delivery status and open/click tracking, for one project or all projects.",
    readOnly: true,
    inputSchema: { projectId: idSchema.optional() },
    handler: async ({ projectId }, ctx) => {
      const rows = projectId != null ? await ctx.portal.email.log.query({ projectId }) : await ctx.portal.email.allLogs.query();
      return {
        totals: {
          sent: rows.filter((r) => r.status === "sent").length,
          failed: rows.filter((r) => r.status === "failed").length,
          opened: rows.filter((r) => r.openCount > 0).length,
          clicked: rows.filter((r) => r.clickCount > 0).length,
        },
        emails: rows,
      };
    },
  }),
];
