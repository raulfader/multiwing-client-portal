import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock session helpers so logout doesn't need a real DB
vi.mock("./auth", () => ({
  checkClientPassword: vi.fn().mockResolvedValue(true),
  checkAdminCredentials: vi.fn().mockResolvedValue(true),
  createSession: vi.fn().mockResolvedValue("mock-token-abc"),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  validateSession: vi.fn().mockResolvedValue(null),
  SESSION_COOKIE: "mw_session",
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { "x-session-token": "mock-token-abc" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.logout", () => {
  it("clears the session and reports success", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
  });
});
