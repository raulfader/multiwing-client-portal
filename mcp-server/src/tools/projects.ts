import { z } from "zod";
import type { Config } from "../config";
import { slugify } from "../files";
import { isMissingProcedure } from "../portal";
import { confirmFlag, defineTool, idSchema, type ToolContext } from "../tool";
import { compactUpdate } from "../util";

export const projectStatusSchema = z
  .enum(["started", "in_progress", "completed"])
  .describe('Project status as shown in the admin UI: started = "In Queue", in_progress = "In Progress", completed = "Completed".');

export const projectRefSchema = {
  projectId: idSchema.optional().describe("Numeric project id."),
  slug: z.string().min(1).optional().describe("Project URL slug (e.g. \"acrex26\"). Used when projectId is omitted."),
};

export function projectUrl(config: Config, slug: string) {
  return `${config.publicUrl}/projects/${slug}`;
}

export async function findProject(ctx: ToolContext, ref: { projectId?: number; slug?: string }) {
  if (ref.projectId == null && !ref.slug) throw new Error("Provide projectId or slug.");
  if (ref.projectId == null) return ctx.portal.projects.bySlug.query({ slug: ref.slug! });
  try {
    return await ctx.portal.projects.byId.query({ id: ref.projectId });
  } catch (err) {
    if (!isMissingProcedure(err)) throw err;
    const project = (await ctx.portal.projects.listAdmin.query()).find((p) => p.id === ref.projectId);
    if (!project) throw new Error(`Project ${ref.projectId} not found`);
    return project;
  }
}

export const projectTools = [
  defineTool({
    name: "list_projects",
    title: "List projects",
    description:
      "List content-hub projects with their status, visibility, category and portal URL. Includes unpublished (hidden) projects unless publishedOnly is true.",
    readOnly: true,
    inputSchema: {
      publishedOnly: z.boolean().default(false).describe("Only return projects visible to clients."),
      status: projectStatusSchema.optional(),
      category: z.string().optional().describe('Filter by category, e.g. "video", "brand", "archive", "document", "event", "audio".'),
    },
    handler: async ({ publishedOnly, status, category }, ctx) => {
      const rows = publishedOnly ? await ctx.portal.projects.list.query() : await ctx.portal.projects.listAdmin.query();
      return rows
        .filter((p) => (status ? p.projectStatus === status : true))
        .filter((p) => (category ? p.category === category : true))
        .map((p) => ({ ...p, isPublished: p.isPublished === 1, portalUrl: projectUrl(ctx.config, p.slug) }));
    },
  }),

  defineTool({
    name: "get_project",
    title: "Get project details",
    description: "Fetch one project by id or slug, optionally with its deliverables (files) and email contacts.",
    readOnly: true,
    inputSchema: {
      ...projectRefSchema,
      includeDeliverables: z.boolean().default(true),
      includeContacts: z.boolean().default(true),
    },
    handler: async ({ projectId, slug, includeDeliverables, includeContacts }, ctx) => {
      const project = await findProject(ctx, { projectId, slug });
      const [deliverables, contacts] = await Promise.all([
        includeDeliverables ? ctx.portal.deliverables.byProject.query({ projectId: project.id }) : undefined,
        includeContacts ? ctx.portal.contacts.list.query({ projectId: project.id }) : undefined,
      ]);
      return {
        project: { ...project, isPublished: project.isPublished === 1 },
        portalUrl: projectUrl(ctx.config, project.slug),
        deliverables,
        contacts,
      };
    },
  }),

  defineTool({
    name: "create_project",
    title: "Create project",
    description:
      "Create a new content-hub project. The slug becomes the client URL (/projects/<slug>) and must be unique; it is derived from the title when omitted. New projects are published (visible) by default, matching the admin UI.",
    readOnly: false,
    inputSchema: {
      title: z.string().min(1).max(255),
      slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes").max(255).optional(),
      description: z.string().optional(),
      category: z.string().default("video").describe('Admin UI categories: "video", "brand", "archive", "document", "event".'),
      coverImageUrl: z.string().optional().describe("Cover image URL, e.g. from upload_image."),
      sortOrder: z.number().int().optional(),
      status: projectStatusSchema.optional().describe("Initial status (defaults to started / In Queue)."),
      published: z.boolean().default(true).describe("Set false to create the project hidden from clients."),
    },
    handler: async (args, ctx) => {
      const slug = args.slug ?? slugify(args.title);
      const created = await ctx.portal.projects.create.mutate({
        title: args.title,
        slug,
        description: args.description,
        coverImageUrl: args.coverImageUrl,
        category: args.category,
        sortOrder: args.sortOrder,
      });
      const id = created.id ?? (await ctx.portal.projects.bySlug.query({ slug })).id;
      if (args.status && args.status !== "started") {
        await ctx.portal.projects.setStatus.mutate({ id, status: args.status });
      }
      if (!args.published) {
        await ctx.portal.projects.update.mutate({ id, isPublished: 0 });
      }
      const project = await findProject(ctx, { projectId: id });
      return { success: true, project, portalUrl: projectUrl(ctx.config, slug) };
    },
  }),

  defineTool({
    name: "update_project",
    title: "Update project settings",
    description: "Edit a project's title, description, cover image, category, sort order, visibility or status. Only provided fields change. The slug cannot be changed.",
    readOnly: false,
    idempotent: true,
    inputSchema: {
      projectId: idSchema,
      title: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      coverImageUrl: z.string().optional(),
      category: z.string().optional(),
      sortOrder: z.number().int().optional(),
      published: z.boolean().optional().describe("true = visible to clients, false = hidden."),
      status: projectStatusSchema.optional(),
    },
    handler: async ({ projectId, published, status, ...rest }, ctx) => {
      const data = compactUpdate({
        ...rest,
        isPublished: published === undefined ? undefined : published ? 1 : 0,
        projectStatus: status,
      });
      await ctx.portal.projects.update.mutate({ id: projectId, ...data });
      return { success: true, project: await findProject(ctx, { projectId }) };
    },
  }),

  defineTool({
    name: "set_project_status",
    title: "Set project status",
    description: "Move a project between In Queue (started), In Progress (in_progress) and Completed (completed). Does not email anyone; use notify_project_finished to complete and notify in one step.",
    readOnly: false,
    idempotent: true,
    inputSchema: { projectId: idSchema, status: projectStatusSchema },
    handler: async ({ projectId, status }, ctx) => {
      await ctx.portal.projects.setStatus.mutate({ id: projectId, status });
      return { success: true, projectId, status };
    },
  }),

  defineTool({
    name: "set_project_visibility",
    title: "Publish or hide project",
    description: "Publish (show to clients) or hide a project from the client portal without deleting it.",
    readOnly: false,
    idempotent: true,
    inputSchema: { projectId: idSchema, published: z.boolean() },
    handler: async ({ projectId, published }, ctx) => {
      await ctx.portal.projects.update.mutate({ id: projectId, isPublished: published ? 1 : 0 });
      return { success: true, projectId, published };
    },
  }),

  defineTool({
    name: "reorder_projects",
    title: "Reorder projects",
    description: "Set the display order of projects in the portal. Pass project ids in the desired order; each gets sortOrder = its index.",
    readOnly: false,
    idempotent: true,
    inputSchema: { projectIds: z.array(idSchema).min(1) },
    handler: async ({ projectIds }, ctx) => {
      await ctx.portal.projects.reorder.mutate({ items: projectIds.map((id, sortOrder) => ({ id, sortOrder })) });
      return { success: true, order: projectIds };
    },
  }),

  defineTool({
    name: "delete_project",
    title: "Delete project",
    description:
      "Permanently delete a project row. The portal backend does not cascade, so its deliverables, contacts and shares are left orphaned; prefer set_project_visibility(published=false) to hide a project instead.",
    readOnly: false,
    destructive: true,
    inputSchema: { projectId: idSchema, confirm: confirmFlag },
    handler: async ({ projectId }, ctx) => {
      await ctx.portal.projects.delete.mutate({ id: projectId });
      return { success: true, deletedProjectId: projectId };
    },
  }),
];
