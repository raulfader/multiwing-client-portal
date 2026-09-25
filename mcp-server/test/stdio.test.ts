import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { allTools } from "../src/tools";
import { startFakePortal } from "./fakePortal";

const PKG = path.resolve(import.meta.dirname, "..");
// Absolute loader URL: the child runs from a temp cwd where bare `tsx` would not resolve.
const ENTRY = ["--import", pathToFileURL(path.join(PKG, "node_modules/tsx/dist/loader.mjs")).href, path.join(PKG, "src/index.ts")];

let tmp: string;
let emptyEnvFile: string;
let fake: Awaited<ReturnType<typeof startFakePortal>>;

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mw-stdio-"));
  emptyEnvFile = path.join(tmp, "empty.env");
  await fs.writeFile(emptyEnvFile, "");
  fake = await startFakePortal({ tokens: { "admin-tok": "admin", "client-tok": "client" } });
});

afterAll(async () => {
  await fake.close();
  await fs.rm(tmp, { recursive: true, force: true });
});

/** Only what a sparse host (e.g. Grok Bot) would inject, plus an isolated env file. */
function hostEnv(extra: Record<string, string>) {
  return { PATH: process.env.PATH ?? "", HOME: tmp, MULTIWING_ENV_FILE: emptyEnvFile, ...extra };
}

async function connectStdio(env: Record<string, string>) {
  const transport = new StdioClientTransport({ command: process.execPath, args: ENTRY, cwd: tmp, env, stderr: "pipe" });
  let stderr = "";
  transport.stderr?.on("data", (d) => (stderr += d));
  const client = new Client({ name: "stdio-test", version: "0" });
  await client.connect(transport);
  const text = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await client.callTool({ name, arguments: args });
    return { isError: Boolean(res.isError), text: (res.content as Array<{ text: string }>)[0].text };
  };
  return { client, transport, text, stderr: () => stderr };
}

function run(args: string[], env: Record<string, string>, stdin = "") {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, [...ENTRY, ...args], { cwd: tmp, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(stdin);
  });
}

describe("stdio lifecycle", () => {
  it("stays up and explains itself when the host injects only the client portal password", async () => {
    const mcp = await connectStdio(hostEnv({ MULTIWING_PORTAL_PASSWORD: "shared-client-password" }));
    const { tools } = await mcp.client.listTools();
    expect(tools).toHaveLength(allTools.length);

    const call = await mcp.text("list_projects");
    expect(call.isError).toBe(true);
    expect(call.text).toMatch(/running but not configured/);
    expect(call.text).toMatch(/\*client\* portal password/);

    const who = JSON.parse((await mcp.text("whoami")).text);
    expect(who).toMatchObject({ ok: false, auth: "none", session: null });

    // Still connected after several calls: the process did not exit.
    expect((await mcp.client.listTools()).tools.length).toBe(allTools.length);
    expect(mcp.transport.pid).toBeGreaterThan(0);
    expect(mcp.stderr()).toMatch(/NOT CONFIGURED/);
    expect(mcp.stderr()).not.toMatch(/shared-client-password/);
    await mcp.client.close();
  }, 30_000);

  it("reads missing credentials from the env file while host-injected vars win", async () => {
    const envFile = path.join(tmp, "creds.env");
    await fs.writeFile(envFile, `MULTIWING_SESSION_TOKEN="admin-tok"\nMULTIWING_API_URL=http://127.0.0.1:1\n`);
    const mcp = await connectStdio({ ...hostEnv({ MULTIWING_API_URL: fake.url }), MULTIWING_ENV_FILE: envFile });
    const who = JSON.parse((await mcp.text("whoami")).text);
    expect(who).toMatchObject({ ok: true, apiUrl: fake.url, session: { role: "admin" }, envFile: { path: envFile, keys: ["MULTIWING_SESSION_TOKEN"] } });
    expect(JSON.stringify(who)).not.toContain("admin-tok");
    expect((await mcp.text("list_projects")).isError).toBe(false);
    await mcp.client.close();
  }, 30_000);

  it("writes only JSON-RPC frames to stdout", async () => {
    const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "raw", version: "0" } } };
    const frames = [init, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 2, method: "tools/list" }, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "whoami", arguments: {} } }];
    const out = await run([], hostEnv({ MULTIWING_API_URL: fake.url, MULTIWING_SESSION_TOKEN: "client-tok" }), frames.map((f) => JSON.stringify(f)).join("\n") + "\n");
    const lines = out.stdout.trim().split("\n");
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(JSON.parse(line).jsonrpc).toBe("2.0");
    const who = JSON.parse(JSON.parse(lines[2]).result.content[0].text);
    expect(who).toMatchObject({ ok: false, session: { role: "client" } });
    expect(out.stderr).toMatch(/ready: \d+ tools/);
    expect(out.code).toBe(0);
  }, 30_000);
});

describe("--check (headless whoami)", () => {
  it("exits 0 with an admin session", async () => {
    const out = await run(["--check"], hostEnv({ MULTIWING_API_URL: fake.url, MULTIWING_SESSION_TOKEN: "admin-tok" }));
    expect(out.code).toBe(0);
    expect(JSON.parse(out.stdout)).toMatchObject({ ok: true, session: { role: "admin" }, backend: { opsRouter: false } });
  }, 30_000);

  it("reports when the deployed portal already has the ops router", async () => {
    const withOps = await startFakePortal({ tokens: { "admin-tok": "admin" }, hasOpsRouter: true });
    try {
      const out = await run(["--check"], hostEnv({ MULTIWING_API_URL: withOps.url, MULTIWING_SESSION_TOKEN: "admin-tok" }));
      expect(JSON.parse(out.stdout).backend).toMatchObject({ opsRouter: true });
      expect(withOps.calls.find((c) => c.path === "ops.search")?.token).toBeNull();
    } finally {
      await withOps.close();
    }
  }, 30_000);

  it("exits 1 and names the problem with a client session or no credentials", async () => {
    const client = await run(["--check"], hostEnv({ MULTIWING_API_URL: fake.url, MULTIWING_SESSION_TOKEN: "client-tok" }));
    expect(client.code).toBe(1);
    expect(JSON.parse(client.stdout).error).toMatch(/not an admin session/);

    const none = await run(["--check"], hostEnv({ MULTIWING_PORTAL_PASSWORD: "x" }));
    expect(none.code).toBe(1);
    expect(JSON.parse(none.stdout).problems[0]).toMatch(/client\* portal password/);
  }, 30_000);
});
