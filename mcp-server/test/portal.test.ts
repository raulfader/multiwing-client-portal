import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config";
import { describeError, PortalSession } from "../src/portal";
import { missingProcedure, testConfig } from "./helpers";

type Call = { path: string; token: string | null; body?: unknown };

/** Minimal stand-in for the portal's tRPC HTTP endpoint (superjson wire format). */
function fakePortal(options: { validTokens: Set<string>; issueToken?: () => string }) {
  const calls: Call[] = [];
  const ok = (data: unknown) => new Response(JSON.stringify({ result: { data: { json: data } } }), { status: 200 });
  const unauthorized = () =>
    new Response(
      JSON.stringify({ error: { json: { message: "Please login (10001)", code: -32001, data: { code: "UNAUTHORIZED", httpStatus: 401 } } } }),
      { status: 401 }
    );

  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/api/trpc/", "");
    const token = new Headers(init?.headers).get("x-session-token");
    const body = init?.body ? JSON.parse(String(init.body)).json : undefined;
    calls.push({ path, token, body });

    if (path === "auth.adminLogin") {
      if (body.password !== "right") return unauthorized();
      const issued = options.issueToken!();
      options.validTokens.add(issued);
      return ok({ success: true, role: "admin", token: issued });
    }
    if (!token || !options.validTokens.has(token)) return unauthorized();
    if (path === "auth.logout") {
      options.validTokens.delete(token);
      return ok({ success: true });
    }
    if (path === "auth.me") return ok({ role: "admin", isGuest: false });
    return ok([]);
  }) as typeof fetch;

  return { fetchImpl, calls };
}

describe("loadConfig", () => {
  it("requires credentials", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({ MULTIWING_ADMIN_EMAIL: "a@b.c" })).toThrow(ConfigError);
  });

  it("prefers a session token and normalises URLs", () => {
    const config = loadConfig({
      MULTIWING_API_URL: "https://multiwing.example/",
      MULTIWING_SESSION_TOKEN: "tok",
      MULTIWING_ADMIN_EMAIL: "a@b.c",
      MULTIWING_ADMIN_PASSWORD: "pw",
      MULTIWING_MCP_READ_ONLY: "true",
    });
    expect(config).toMatchObject({ apiUrl: "https://multiwing.example", publicUrl: "https://multiwing.example", authMode: "session-token", readOnly: true });
  });
});

describe("PortalSession", () => {
  it("sends the session token in the x-session-token header", async () => {
    const portal = fakePortal({ validTokens: new Set(["tok"]) });
    const session = new PortalSession(testConfig({ sessionToken: "tok" }), portal.fetchImpl);
    await expect(session.client.auth.me.query()).resolves.toEqual({ role: "admin", isGuest: false });
    expect(portal.calls).toEqual([{ path: "auth.me", token: "tok", body: undefined }]);
  });

  it("logs in with admin credentials, re-logs in once after expiry, and logs out on close", async () => {
    let n = 0;
    const valid = new Set<string>();
    const portal = fakePortal({ validTokens: valid, issueToken: () => `session-${++n}` });
    const session = new PortalSession(
      testConfig({ authMode: "admin-login", sessionToken: undefined, adminEmail: "hello@faderlabs.com", adminPassword: "right" }),
      portal.fetchImpl
    );

    await session.client.projects.listAdmin.query();
    expect(portal.calls.map((c) => c.path)).toEqual(["auth.adminLogin", "projects.listAdmin"]);
    expect(portal.calls[1].token).toBe("session-1");

    valid.clear(); // server-side expiry
    await session.client.projects.listAdmin.query();
    expect(portal.calls.slice(2).map((c) => [c.path, c.token])).toEqual([
      ["projects.listAdmin", "session-1"],
      ["auth.adminLogin", null],
      ["projects.listAdmin", "session-2"],
    ]);

    await session.close();
    expect(portal.calls.at(-1)).toMatchObject({ path: "auth.logout", token: "session-2" });
    expect(valid.size).toBe(0);
  });

  it("does not retry or log out a pre-issued token", async () => {
    const portal = fakePortal({ validTokens: new Set() });
    const session = new PortalSession(testConfig({ sessionToken: "stale" }), portal.fetchImpl);
    await expect(session.client.auth.me.query()).rejects.toThrow("Please login");
    await session.close();
    expect(portal.calls.map((c) => c.path)).toEqual(["auth.me"]);
  });

  it("surfaces a clear error for wrong admin credentials", async () => {
    const portal = fakePortal({ validTokens: new Set(), issueToken: () => "x" });
    const session = new PortalSession(
      testConfig({ authMode: "admin-login", sessionToken: undefined, adminEmail: "a@b.c", adminPassword: "wrong" }),
      portal.fetchImpl
    );
    await expect(session.client.projects.listAdmin.query()).rejects.toThrow();
  });
});

describe("describeError", () => {
  it("explains procedures missing from older portal backends", () => {
    expect(describeError(missingProcedure("ops.search"))).toMatch(/older backend/);
  });
});
