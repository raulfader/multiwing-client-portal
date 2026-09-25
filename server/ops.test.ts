import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    insertIdOf: actual.insertIdOf,
    getCommentInbox: vi.fn().mockResolvedValue([]),
    getReviewSummary: vi.fn().mockResolvedValue([]),
    getActivityLog: vi.fn().mockResolvedValue([]),
    searchHub: vi.fn().mockResolvedValue({ projects: [], deliverables: [], comments: [], tracks: [], contacts: [], clientRequests: [] }),
    createProject: vi.fn().mockResolvedValue([{ insertId: 42 }, []]),
    createDeliverable: vi.fn().mockResolvedValue([{ insertId: 7 }, []]),
    getProjectById: vi.fn().mockResolvedValue(null),
    getDeliverableById: vi.fn().mockResolvedValue({ id: 7, projectId: 42, title: "Cut v1", thumbnailUrl: null }),
  };
});

function ctx(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role
      ? ({ id: 0, openId: role, name: role, email: null, role, loginMethod: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() })
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => vi.clearAllMocks());

describe("insertIdOf", () => {
  it("reads the insert id from mysql2 tuple and plain header results", async () => {
    const { insertIdOf } = await vi.importActual<typeof import("./db")>("./db");
    expect(insertIdOf([{ insertId: 5 }, []])).toBe(5);
    expect(insertIdOf({ insertId: 9 })).toBe(9);
    expect(insertIdOf(undefined)).toBeNull();
    expect(insertIdOf([{ insertId: 0 }])).toBeNull();
  });
});

describe("ops router", () => {
  it("passes comment inbox filters through for admins", async () => {
    const { getCommentInbox } = await import("./db");
    const since = new Date("2026-01-01T00:00:00Z");
    await appRouter.createCaller(ctx("admin")).ops.commentInbox({ status: "unanswered", projectId: 3, since });
    expect(vi.mocked(getCommentInbox)).toHaveBeenCalledWith({ status: "unanswered", projectId: 3, since });
  });

  it("defaults to an empty filter when no input is given", async () => {
    const { getCommentInbox, getReviewSummary, getActivityLog } = await import("./db");
    const caller = appRouter.createCaller(ctx("admin"));
    await caller.ops.commentInbox();
    await caller.ops.reviewSummary();
    await caller.ops.activity();
    expect(vi.mocked(getCommentInbox)).toHaveBeenCalledWith({});
    expect(vi.mocked(getReviewSummary)).toHaveBeenCalledWith(undefined);
    expect(vi.mocked(getActivityLog)).toHaveBeenCalledWith({});
  });

  it("rejects client and anonymous sessions", async () => {
    await expect(appRouter.createCaller(ctx("user")).ops.reviewSummary()).rejects.toThrow();
    await expect(appRouter.createCaller(ctx(null)).ops.commentInbox()).rejects.toThrow();
    await expect(appRouter.createCaller(ctx("user")).ops.search({ query: "promo" })).rejects.toThrow();
  });

  it("rejects blank search queries", async () => {
    await expect(appRouter.createCaller(ctx("admin")).ops.search({ query: "   " })).rejects.toThrow();
  });
});

describe("create mutations return the new id", () => {
  it("projects.create", async () => {
    const result = await appRouter.createCaller(ctx("admin")).projects.create({ title: "Launch", slug: "launch" });
    expect(result).toEqual({ success: true, id: 42 });
  });

  it("deliverables.create", async () => {
    const result = await appRouter.createCaller(ctx("admin")).deliverables.create({ projectId: 42, title: "Cut v1" });
    expect(result).toEqual({ success: true, id: 7 });
  });
});

describe("byId lookups", () => {
  it("projects.byId returns NOT_FOUND for unknown ids", async () => {
    await expect(appRouter.createCaller(ctx("admin")).projects.byId({ id: 999 })).rejects.toThrow("Project not found");
  });

  it("deliverables.byId is admin-only", async () => {
    const admin = await appRouter.createCaller(ctx("admin")).deliverables.byId({ id: 7 });
    expect(admin.title).toBe("Cut v1");
    await expect(appRouter.createCaller(ctx("user")).deliverables.byId({ id: 7 })).rejects.toThrow();
  });
});
