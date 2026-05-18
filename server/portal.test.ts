import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB helpers ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllPillars: vi.fn().mockResolvedValue([
    { id: 1, title: "Brand Anthem", description: "Core brand sound", sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, title: "UI Sounds", description: "Interface audio", sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getPillarById: vi.fn().mockResolvedValue({
    id: 1, title: "Brand Anthem", description: "Core brand sound", sortOrder: 0, createdAt: new Date(), updatedAt: new Date(),
  }),
  createPillar: vi.fn().mockResolvedValue({ insertId: 3 }),
  updatePillar: vi.fn().mockResolvedValue(undefined),
  deletePillar: vi.fn().mockResolvedValue(undefined),
  getTracksByPillar: vi.fn().mockResolvedValue([
    { id: 1, pillarId: 1, title: "Track A", description: null, audioUrl: "https://cdn.example.com/a.mp3", audioKey: "tracks/1/a.mp3", sortOrder: 0, durationSeconds: 120, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getTrackById: vi.fn().mockResolvedValue({
    id: 1, pillarId: 1, title: "Track A", description: null, audioUrl: "https://cdn.example.com/a.mp3", audioKey: "tracks/1/a.mp3", sortOrder: 0, durationSeconds: 120, createdAt: new Date(), updatedAt: new Date(),
  }),
  countTracksByPillar: vi.fn().mockResolvedValue(1),
  createTrack: vi.fn().mockResolvedValue({ insertId: 2 }),
  deleteTrack: vi.fn().mockResolvedValue(undefined),
  getAllTracksWithPillars: vi.fn().mockResolvedValue([]),
  getCommentsByTrack: vi.fn().mockResolvedValue([
    { id: 1, trackId: 1, userId: 1, content: "Sounds great!", timestampSeconds: 30, createdAt: new Date(), userName: "Alice" },
  ]),
  getAllComments: vi.fn().mockResolvedValue([]),
  createComment: vi.fn().mockResolvedValue({ insertId: 2 }),
  resolveComment: vi.fn().mockResolvedValue(undefined),
  unresolveComment: vi.fn().mockResolvedValue(undefined),
  respondToComment: vi.fn().mockResolvedValue(undefined),
  resolveDeliverableComment: vi.fn().mockResolvedValue(undefined),
  unresolveDeliverableComment: vi.fn().mockResolvedValue(undefined),
  respondToDeliverableComment: vi.fn().mockResolvedValue(undefined),
  getApprovalByPillarAndUser: vi.fn().mockResolvedValue(undefined),
  getAllApprovals: vi.fn().mockResolvedValue([]),
  upsertApproval: vi.fn().mockResolvedValue(undefined),
  getApprovalsByPillar: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getSiteSettings: vi.fn().mockResolvedValue({}),
  setSiteSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/track.mp3", key: "tracks/1/abc.mp3" }),
}));

vi.mock("./s3Upload", () => ({
  generatePresignedUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: "https://s3.example.com/presigned-put",
    fileKey: "tracks/pillar-1/abc123.mp3",
    publicUrl: "https://cdn.example.com/tracks/pillar-1/abc123.mp3",
  }),
}));

// ── Context helpers ────────────────────────────────────────────────────────────
function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(): TrpcContext {
  return {
    user: {
      id: 1, openId: "user-1", name: "Alice", email: "alice@example.com",
      loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 2, openId: "admin-1", name: "Faderlabs Admin", email: "admin@faderlabs.com",
      loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("pillars.list", () => {
  it("returns all pillars for public users", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.pillars.list();
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Brand Anthem");
  });
});

describe("pillars.create", () => {
  it("allows admin to create a pillar", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.pillars.create({ title: "New Pillar", description: "Test" });
    expect(result.success).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.pillars.create({ title: "Hack" })).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.pillars.create({ title: "Hack" })).rejects.toThrow();
  });
});

describe("tracks.byPillar", () => {
  it("returns tracks for a given pillar", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.tracks.byPillar({ pillarId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Track A");
  });
});

describe("tracks.getUploadUrl", () => {
  it("allows admin to get a presigned upload URL", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tracks.getUploadUrl({
      pillarId: 1,
      fileName: "test.mp3",
      contentType: "audio/mpeg",
    });
    expect(result.uploadUrl).toBeDefined();
    expect(result.fileKey).toBeDefined();
    expect(result.publicUrl).toBeDefined();
  });

  it("allows upload even when pillar already has 2+ tracks (no limit)", async () => {
    const { countTracksByPillar } = await import("./db");
    vi.mocked(countTracksByPillar).mockResolvedValueOnce(2);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tracks.getUploadUrl({
      pillarId: 1,
      fileName: "test.mp3",
      contentType: "audio/mpeg",
    });
    expect(result.uploadUrl).toBeDefined();
  });
});

describe("comments.add", () => {
  it("allows authenticated user to add a comment", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.comments.add({ trackId: 1, commenterName: "Test User", content: "Sounds great!", timestampSeconds: 30 });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated comment submission", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.comments.add({ trackId: 1, commenterName: "Hacker", content: "Hack" })).rejects.toThrow();
  });
});

describe("approvals.set", () => {
  it("allows authenticated user to approve a pillar", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.approvals.set({ pillarId: 1, status: "approved", note: "Love it!" });
    expect(result.success).toBe(true);
  });

  it("allows authenticated user to reject a pillar", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.approvals.set({ pillarId: 1, status: "rejected", note: "Needs work" });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated approval", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.approvals.set({ pillarId: 1, status: "approved" })).rejects.toThrow();
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeUserCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

describe("sonicBrandingSettings.get", () => {
  it("returns default hero text when no settings exist", async () => {
    const { getSiteSettings } = await import("./db");
    vi.mocked(getSiteSettings).mockResolvedValueOnce({});
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.sonicBrandingSettings.get();
    expect(result.heroTitle).toBe("Sonic Branding Proposal");
    expect(result.heroSubtitle).toContain("timestamped feedback");
  });

  it("returns stored hero text when settings exist", async () => {
    const { getSiteSettings } = await import("./db");
    vi.mocked(getSiteSettings).mockResolvedValueOnce({
      sonic_branding_hero_title: "Custom Title",
      sonic_branding_hero_subtitle: "Custom subtitle.",
    });
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.sonicBrandingSettings.get();
    expect(result.heroTitle).toBe("Custom Title");
    expect(result.heroSubtitle).toBe("Custom subtitle.");
  });
});

describe("sonicBrandingSettings.update", () => {
  it("allows admin to update hero title", async () => {
    const { setSiteSetting } = await import("./db");
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.sonicBrandingSettings.update({ heroTitle: "New Title" });
    expect(result.success).toBe(true);
    expect(vi.mocked(setSiteSetting)).toHaveBeenCalledWith("sonic_branding_hero_title", "New Title");
  });

  it("rejects non-admin update", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.sonicBrandingSettings.update({ heroTitle: "Hack" })).rejects.toThrow();
  });
});
