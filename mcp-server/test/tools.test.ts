import fs from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { connect, missingProcedure } from "./helpers";

const project = {
  id: 5, title: "ACREX 26", slug: "acrex26", description: null, coverImageUrl: null, category: "video",
  sortOrder: 0, isPublished: 1, projectStatus: "in_progress", createdAt: new Date(), updatedAt: new Date(),
};
const contacts = [
  { id: 11, projectId: 5, firstName: "Ana", lastName: "Silva", email: "ana@multiwing.example", createdAt: new Date() },
  { id: 12, projectId: 5, firstName: "Ben", lastName: null, email: "ben@multiwing.example", createdAt: new Date() },
];

let tmp: string;
let s3: http.Server;
let s3Url: string;
let s3Status = 200;
const s3Puts: Array<{ url?: string; size: number }> = [];

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mw-mcp-tools-"));
  s3 = http.createServer((req, res) => {
    let size = 0;
    req.on("data", (c: Buffer) => (size += c.length));
    req.on("end", () => {
      s3Puts.push({ url: req.url, size });
      res.writeHead(s3Status).end(s3Status === 200 ? "" : "<Error><Message>SignatureDoesNotMatch</Message></Error>");
    });
  });
  await new Promise<void>((r) => s3.listen(0, "127.0.0.1", r));
  s3Url = `http://127.0.0.1:${(s3.address() as AddressInfo).port}`;
});

afterAll(async () => {
  s3.close();
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("notify_project_finished", () => {
  function stubs() {
    return {
      projects: {
        byId: { query: vi.fn(async () => project) },
        setStatus: { mutate: vi.fn(async () => ({ success: true })) },
      },
      contacts: { list: { query: vi.fn(async () => contacts) } },
      email: {
        sendNotification: {
          mutate: vi.fn(async (input: { contactIds: number[] }) => ({
            success: true,
            results: input.contactIds.map((id) => ({ contactId: id, email: `${id}@x`, success: true })),
          })),
        },
      },
    };
  }

  it("previews without changing or sending anything on dryRun", async () => {
    const portal = stubs();
    const { call } = await connect(portal);
    const res = await call("notify_project_finished", { projectId: 5, dryRun: true });
    expect(res.isError).toBe(false);
    expect(res.data).toMatchObject({
      dryRun: true,
      willMarkCompleted: true,
      subject: "Your ACREX 26 is complete",
      portalUrl: "https://multiwing.example/projects/acrex26",
    });
    expect(res.data.recipients).toHaveLength(2);
    expect(portal.projects.setStatus.mutate).not.toHaveBeenCalled();
    expect(portal.email.sendNotification.mutate).not.toHaveBeenCalled();
  });

  it("does nothing without confirm=true", async () => {
    const portal = stubs();
    const { call } = await connect(portal);
    const res = await call("notify_project_finished", { projectId: 5 });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/confirm: true/);
    expect(portal.projects.setStatus.mutate).not.toHaveBeenCalled();
    expect(portal.email.sendNotification.mutate).not.toHaveBeenCalled();
  });

  it("marks the project completed and emails the selected contacts", async () => {
    const portal = stubs();
    const { call } = await connect(portal);
    const res = await call("notify_project_finished", { projectId: 5, contactIds: [12], confirm: true });
    expect(res.data).toMatchObject({ success: true, markedCompleted: true, sent: 1, failed: 0 });
    expect(portal.projects.setStatus.mutate).toHaveBeenCalledWith({ id: 5, status: "completed" });
    expect(portal.email.sendNotification.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 5, contactIds: [12], subject: "Your ACREX 26 is complete" })
    );
  });

  it("refuses to send when the project has no contacts", async () => {
    const portal = stubs();
    portal.contacts.list.query.mockResolvedValueOnce([]);
    const { call } = await connect(portal);
    const res = await call("notify_project_finished", { projectId: 5 });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/add_project_contact/);
    expect(portal.projects.setStatus.mutate).not.toHaveBeenCalled();
  });
});

describe("upload_file_to_project", () => {
  function stubs() {
    return {
      projects: { byId: { query: vi.fn(async () => project) } },
      deliverables: {
        byProject: { query: vi.fn(async () => [{ id: 1 }, { id: 2 }]) },
        create: { mutate: vi.fn(async () => ({ success: true, id: 77 })) },
        getUploadUrl: {
          mutate: vi.fn(async () => ({ uploadUrl: `${s3Url}/deliverables/77-cut.mov?sig=1`, fileKey: "deliverables/123-77-cut.mov", publicUrl: "aws-media:deliverables/123-77-cut.mov" })),
        },
        update: { mutate: vi.fn(async () => ({ success: true })) },
        delete: { mutate: vi.fn(async () => ({ success: true })) },
      },
    };
  }

  it("creates a deliverable, uploads to the presigned URL, and records file metadata", async () => {
    s3Status = 200;
    const file = path.join(tmp, "Final Cut v3.mov");
    await fs.writeFile(file, Buffer.alloc(2048, 3));
    const portal = stubs();
    const { call } = await connect(portal);
    const res = await call("upload_file_to_project", { projectId: 5, filePath: file });

    expect(res.isError, res.text).toBe(false);
    expect(res.data).toMatchObject({ success: true, deliverableId: 77, created: true, contentType: "video/quicktime" });
    expect(res.data.transcoding).toMatch(/pending/);
    expect(portal.deliverables.create.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 5, title: "Final Cut v3", fileType: "video", sortOrder: 2 })
    );
    expect(portal.deliverables.getUploadUrl.mutate).toHaveBeenCalledWith({ fileName: "Final Cut v3.mov", contentType: "video/quicktime", deliverableId: 77 });
    expect(s3Puts.at(-1)?.size).toBe(2048);
    expect(portal.deliverables.update.mutate).toHaveBeenCalledWith({
      id: 77,
      fileKey: "deliverables/123-77-cut.mov",
      fileName: "Final Cut v3.mov",
      fileSize: 2048,
      downloadUrl: "aws-media:deliverables/123-77-cut.mov",
      fileType: "video",
    });
  });

  it("removes the placeholder deliverable if the S3 upload fails", async () => {
    s3Status = 403;
    const file = path.join(tmp, "notes.pdf");
    await fs.writeFile(file, "pdf");
    const portal = stubs();
    const { call } = await connect(portal);
    const res = await call("upload_file_to_project", { projectId: 5, filePath: file });
    s3Status = 200;
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/SignatureDoesNotMatch/);
    expect(portal.deliverables.delete.mutate).toHaveBeenCalledWith({ id: 77 });
    expect(portal.deliverables.update.mutate).not.toHaveBeenCalled();
  });
});

describe("list_review_comments", () => {
  it("uses ops.commentInbox with parsed filters", async () => {
    const commentInbox = vi.fn(async () => []);
    const { call } = await connect({ ops: { commentInbox: { query: commentInbox } } });
    await call("list_review_comments", { status: "unanswered", since: "24h", projectId: 5 });
    const arg = (commentInbox.mock.calls[0] as unknown[])[0] as { status: string; since: Date; projectId: number };
    expect(arg).toMatchObject({ status: "unanswered", projectId: 5, source: "all", limit: 50 });
    expect(arg.since).toBeInstanceOf(Date);
  });

  it("falls back to existing procedures on portals without the ops router", async () => {
    const old = new Date("2026-01-01T00:00:00Z");
    const recent = new Date("2026-09-20T00:00:00Z");
    const { call } = await connect({
      ops: { commentInbox: { query: async () => { throw missingProcedure("ops.commentInbox"); } } },
      projects: { listAdmin: { query: async () => [project] } },
      deliverables: { byProject: { query: async () => [{ id: 9, title: "Teaser", reviewStatus: "needs_changes" }] } },
      deliverableComments: {
        all: {
          query: async () => [
            { id: 1, deliverableId: 9, content: "Logo too small", adminResponse: null, resolvedAt: null, createdAt: recent },
            { id: 2, deliverableId: 9, content: "Done", adminResponse: "Fixed", resolvedAt: recent, createdAt: old },
          ],
        },
      },
      tracks: { allWithPillars: { query: async () => [] } },
      pillars: { list: { query: async () => [] } },
      comments: { all: { query: async () => [] } },
    } as never);
    const res = await call("list_review_comments", {});
    expect(res.isError, res.text).toBe(false);
    expect(res.data).toHaveLength(1);
    expect(res.data[0]).toMatchObject({ kind: "deliverable", id: 1, deliverableTitle: "Teaser", projectSlug: "acrex26" });
  });
});

describe("reply_to_comment", () => {
  it("routes to the track or deliverable comment API and can resolve in one step", async () => {
    const portal = {
      comments: { respond: { mutate: vi.fn(async () => ({ success: true })) }, resolve: { mutate: vi.fn(async () => ({ success: true })) } },
      deliverableComments: { respond: { mutate: vi.fn(async () => ({ success: true })) }, resolve: { mutate: vi.fn(async () => ({ success: true })) } },
    };
    const { call } = await connect(portal);
    await call("reply_to_comment", { commentId: 3, message: "On it" });
    await call("reply_to_comment", { kind: "track", commentId: 4, message: "Fixed", resolve: true });
    expect(portal.deliverableComments.respond.mutate).toHaveBeenCalledWith({ id: 3, adminResponse: "On it" });
    expect(portal.comments.resolve.mutate).toHaveBeenCalledWith({ id: 4, adminResponse: "Fixed" });
  });
});

describe("resolve_comment", () => {
  it("re-sends the existing reply so older portal builds (live) don't erase it", async () => {
    const resolve = vi.fn(async () => ({ success: true }));
    const { call } = await connect({
      deliverableComments: {
        all: { query: async () => [{ id: 7, adminResponse: "Fixed in v2", resolvedAt: null, createdAt: new Date(), deliverableId: 1 }] },
        resolve: { mutate: resolve },
      },
    } as never);
    const kept = await call("resolve_comment", { commentId: 7 });
    expect(kept.data).toMatchObject({ resolved: true, keptExistingReply: true });
    expect(resolve).toHaveBeenLastCalledWith({ id: 7, adminResponse: "Fixed in v2" });
    await call("resolve_comment", { commentId: 7, message: "Final" });
    expect(resolve).toHaveBeenLastCalledWith({ id: 7, adminResponse: "Final" });
    expect((await call("resolve_comment", { commentId: 99 })).text).toMatch(/comment 99 not found/);
  });
});

describe("attach_uploaded_file", () => {
  it("stores the server-issued publicUrl rather than a build-specific synthesized value", async () => {
    const update = vi.fn(async () => ({ success: true }));
    const { call } = await connect({
      deliverables: { update: { mutate: update }, byId: { query: async () => ({ id: 3, projectId: 5 }) } },
    } as never);
    expect((await call("attach_uploaded_file", { deliverableId: 3, fileKey: "deliverables/a.mp4", fileName: "a.mp4" })).isError).toBe(true);
    const publicUrl = "https://faderlabs-client-uploads.s3.us-east-2.amazonaws.com/deliverables/a.mp4";
    await call("attach_uploaded_file", { deliverableId: 3, fileKey: "deliverables/a.mp4", fileName: "a.mp4", publicUrl });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 3, downloadUrl: publicUrl, fileType: "video" }));
  });
});

describe("update_client_request", () => {
  it("keeps existing admin notes when only the status changes", async () => {
    const request = { id: 3, status: "new", adminNotes: "Budget approved", files: [] };
    const updateStatus = vi.fn(async () => ({ success: true }));
    const { call } = await connect({
      clientRequests: { list: { query: async () => [request] }, updateStatus: { mutate: updateStatus } },
    } as never);
    await call("update_client_request", { requestId: 3, status: "in_review" });
    expect(updateStatus).toHaveBeenCalledWith({ id: 3, status: "in_review", adminNotes: "Budget approved" });
  });
});

describe("share_project", () => {
  it("builds invite links on the public portal origin", async () => {
    const create = vi.fn(async () => ({ success: true, shareToken: "t", shareUrl: "https://multiwing.example/share/t" }));
    const { call } = await connect({ shares: { create: { mutate: create } } });
    expect((await call("share_project", { projectId: 5, email: "vendor@example.com", accessLevel: "download" })).isError).toBe(true);
    expect(create).not.toHaveBeenCalled();
    await call("share_project", { projectId: 5, email: "vendor@example.com", accessLevel: "download", confirm: true });
    expect(create).toHaveBeenCalledWith({ projectId: 5, email: "vendor@example.com", accessLevel: "download", origin: "https://multiwing.example" });
  });
});

describe("configuration problems", () => {
  it("blocks portal tools but keeps whoami working", async () => {
    const listAdmin = vi.fn(async () => []);
    const { call } = await connect({ projects: { listAdmin: { query: listAdmin } } }, { config: { authMode: "none", problems: ["No admin credentials configured."] } });
    const res = await call("list_projects");
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/running but not configured[\s\S]*No admin credentials/);
    const who = await call("whoami");
    expect(who.isError).toBe(false);
    expect(who.data).toMatchObject({ ok: false, problems: ["No admin credentials configured."] });
    expect(listAdmin).not.toHaveBeenCalled();
  });
});
