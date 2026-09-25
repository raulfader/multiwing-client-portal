import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { describeAuth, loadConfig } from "../src/config";
import { loadEnvFile, parseEnvFile } from "../src/envFile";
import { CLIENT_VERSION, describeError, PortalSession } from "../src/portal";
import { startFakePortal } from "./fakePortal";
import { missingProcedure, testConfig } from "./helpers";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

async function portal(options: Parameters<typeof startFakePortal>[0]) {
  const p = await startFakePortal(options);
  cleanups.push(p.close);
  return p;
}

describe("loadConfig", () => {
  it("never throws for missing credentials; reports a problem instead", () => {
    const config = loadConfig({});
    expect(config.authMode).toBe("none");
    expect(config.problems.join(" ")).toMatch(/MULTIWING_SESSION_TOKEN/);
    expect(config.warnings.join(" ")).toMatch(/MULTIWING_API_URL is not set/);
  });

  it("explains that the client portal password cannot run admin tools", () => {
    const config = loadConfig({ MULTIWING_PORTAL_PASSWORD: "x" });
    expect(config.authMode).toBe("none");
    expect(config.problems[0]).toMatch(/\*client\* portal password/);
  });

  it("flags half-configured admin login", () => {
    expect(loadConfig({ MULTIWING_ADMIN_EMAIL: "a@b.c" }).problems[0]).toMatch(/MULTIWING_ADMIN_PASSWORD is missing/);
  });

  it("prefers a session token, strips devtools quotes and normalises URLs", () => {
    const config = loadConfig({
      MULTIWING_API_URL: "https://multiwing.example/",
      MULTIWING_SESSION_TOKEN: ' "abc123" ',
      MULTIWING_ADMIN_EMAIL: "a@b.c",
      MULTIWING_ADMIN_PASSWORD: "pw",
      MULTIWING_MCP_READ_ONLY: "true",
    });
    expect(config).toMatchObject({ apiUrl: "https://multiwing.example", publicUrl: "https://multiwing.example", authMode: "session-token", sessionToken: "abc123", readOnly: true, problems: [] });
    expect(describeAuth(config)).toBe("session-token (falls back to admin-login)");
  });

  it("refuses to send credentials over plain HTTP to non-loopback hosts unless allowed", () => {
    const env = { MULTIWING_API_URL: "http://multiwing.example", MULTIWING_SESSION_TOKEN: "t" };
    expect(loadConfig(env).problems[0]).toMatch(/plain HTTP/);
    expect(loadConfig({ ...env, MULTIWING_ALLOW_INSECURE_HTTP: "true" }).problems).toEqual([]);
    expect(loadConfig({ ...env, MULTIWING_API_URL: "http://127.0.0.1:3000" }).problems).toEqual([]);
  });

  it("restricts local file access to the download dir by default", () => {
    const base = { MULTIWING_SESSION_TOKEN: "t", MULTIWING_DOWNLOAD_DIR: "/tmp/mw-dl" };
    expect(loadConfig(base).fileRoots).toEqual([path.resolve("/tmp/mw-dl")]);
    expect(loadConfig({ ...base, MULTIWING_FILE_ROOTS: "*" }).fileRoots).toEqual([]);
    expect(loadConfig({ ...base, MULTIWING_FILE_ROOTS: `/a${path.delimiter}/b` }).fileRoots).toEqual([path.resolve("/a"), path.resolve("/b")]);
  });
});

describe("env file", () => {
  it("parses dotenv syntax", () => {
    expect(parseEnvFile(`# comment\nexport A=1\nB="two words"\nC='x#y'\nD=plain # trailing\n=bad\n`)).toEqual({ A: "1", B: "two words", C: "x#y", D: "plain" });
  });

  it("fills only variables the host did not inject", async () => {
    const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "mw-env-")), ".env");
    await fs.writeFile(file, "MULTIWING_SESSION_TOKEN=from-file\nMULTIWING_API_URL=https://file.example\n");
    const env: NodeJS.ProcessEnv = { MULTIWING_API_URL: "https://host.example", MULTIWING_PORTAL_PASSWORD: "x" };
    const result = loadEnvFile(env, file);
    expect(result.loaded).toEqual(["MULTIWING_SESSION_TOKEN"]);
    expect(env).toMatchObject({ MULTIWING_API_URL: "https://host.example", MULTIWING_SESSION_TOKEN: "from-file" });
  });

  it("reports an explicit MULTIWING_ENV_FILE that does not exist", () => {
    expect(loadEnvFile({ MULTIWING_ENV_FILE: "/nope/.env" }).error).toMatch(/not found/);
  });
});

describe("PortalSession", () => {
  it("sends the session token and a user agent", async () => {
    const p = await portal({ tokens: { tok: "admin" } });
    const session = new PortalSession(testConfig({ apiUrl: p.url, sessionToken: "tok" }));
    await expect(session.client.auth.me.query()).resolves.toEqual({ role: "admin", isGuest: false });
    expect(p.calls[0]).toMatchObject({ path: "auth.me", token: "tok", userAgent: `multiwing-mcp/${CLIENT_VERSION}` });
  });

  it("re-logs in when an admin procedure returns 403 (10002) for an expired login session", async () => {
    const p = await portal({ adminPassword: "right" });
    const session = new PortalSession(testConfig({ apiUrl: p.url, authMode: "admin-login", sessionToken: undefined, adminEmail: "a@b.c", adminPassword: "right" }));
    await session.client.projects.listAdmin.query();
    p.tokens.clear();
    await session.client.projects.listAdmin.query();
    expect(p.paths()).toEqual(["auth.adminLogin", "projects.listAdmin", "projects.listAdmin", "auth.adminLogin", "projects.listAdmin"]);
    await session.close();
    expect(p.calls.at(-1)).toMatchObject({ path: "auth.logout", token: "login-2" });
    expect(p.tokens.size).toBe(0);
  });

  it("falls back from a rejected session token to admin login when both are configured", async () => {
    const p = await portal({ adminPassword: "right" });
    const session = new PortalSession(testConfig({ apiUrl: p.url, sessionToken: "expired", adminEmail: "a@b.c", adminPassword: "right" }));
    await expect(session.client.projects.listAdmin.query()).resolves.toHaveLength(1);
    expect(p.calls.map((c) => [c.path, c.token])).toEqual([
      ["projects.listAdmin", "expired"],
      ["auth.adminLogin", null],
      ["projects.listAdmin", "login-1"],
    ]);
  });

  it("does not retry business-rule FORBIDDEN errors", async () => {
    const p = await portal({ adminPassword: "right", tokens: { tok: "admin" } });
    const session = new PortalSession(testConfig({ apiUrl: p.url, sessionToken: "tok", adminEmail: "a@b.c", adminPassword: "right" }));
    await expect(session.client.shares.requestOtp.mutate({ token: "t", email: "a@b.c", origin: "https://x" })).rejects.toThrow("Email does not match");
    expect(p.paths()).toEqual(["shares.requestOtp"]);
  });

  it("does not retry or log out a pre-issued token without admin credentials", async () => {
    const p = await portal({});
    const session = new PortalSession(testConfig({ apiUrl: p.url, sessionToken: "stale" }));
    const err = await session.client.projects.listAdmin.query().catch((e) => e);
    expect(describeError(err)).toMatch(/not an admin session/);
    await session.close();
    expect(p.paths()).toEqual(["projects.listAdmin"]);
  });

  it("backs off after the portal rejects the admin password instead of retrying every call", async () => {
    const p = await portal({ adminPassword: "live-password" });
    let now = 0;
    const session = new PortalSession(
      testConfig({ apiUrl: p.url, authMode: "admin-login", sessionToken: undefined, adminEmail: "a@b.c", adminPassword: "manus-password" }),
      fetch,
      () => now
    );
    for (let i = 0; i < 3; i++) {
      const err = await session.client.projects.listAdmin.query().catch((e) => e);
      expect(describeError(err)).toMatch(/Invalid admin credentials.*Prefer MULTIWING_SESSION_TOKEN/);
    }
    expect(p.paths()).toEqual(["auth.adminLogin"]);
    now = 61_000;
    await session.client.projects.listAdmin.query().catch(() => undefined);
    expect(p.paths()).toEqual(["auth.adminLogin", "auth.adminLogin"]);
  });
});

describe("describeError", () => {
  it("explains procedures missing from older portal backends", () => {
    expect(describeError(missingProcedure("ops.search"))).toMatch(/older backend/);
  });

  it("names the portal URL and cause when it is unreachable", async () => {
    const p = await startFakePortal({});
    await p.close();
    const config = testConfig({ apiUrl: p.url, requestTimeoutMs: 2_000 });
    const err = await new PortalSession(config).client.auth.me.query().catch((e) => e);
    expect(describeError(err, config)).toBe(`Could not reach the portal at ${p.url} (ECONNREFUSED). Check MULTIWING_API_URL and network access.`);
  });
});
