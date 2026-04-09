import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 0,
    openId: "admin",
    email: "hello@faderlabs.com",
    name: "Admin",
    loginMethod: null,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createClientContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 0,
    openId: "client",
    email: null,
    name: "Client",
    loginMethod: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("adminProcedure access control", () => {
  it("allows admin users to access admin-only procedures (pillars.list is public, pillars.create is admin)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // pillars.list is public — should work for admin too
    const pillars = await caller.pillars.list();
    expect(Array.isArray(pillars)).toBe(true);
  });

  it("rejects unauthenticated users from admin procedures with FORBIDDEN (not 10001)", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // projects.listAdmin is adminProcedure — should throw FORBIDDEN, not 10001
    await expect(caller.projects.listAdmin()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects client (non-admin) users from admin procedures", async () => {
    const ctx = createClientContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.projects.listAdmin()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows admin to call projects.listAdmin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const projects = await caller.projects.listAdmin();
    expect(Array.isArray(projects)).toBe(true);
  });
});
