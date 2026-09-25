import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TRPCClientError } from "@trpc/client";
import os from "node:os";
import path from "node:path";
import type { Config } from "../src/config";
import type { PortalClient } from "../src/portal";
import { registerTools, type ToolDefinition } from "../src/tool";
import { allTools } from "../src/tools";

export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    apiUrl: "http://portal.test",
    publicUrl: "https://multiwing.example",
    authMode: "session-token",
    sessionToken: "test-token",
    readOnly: false,
    teamName: "Faderlabs",
    downloadDir: path.join(os.tmpdir(), "multiwing-mcp-test-downloads"),
    fileRoots: [],
    requestTimeoutMs: 5_000,
    ...overrides,
  };
}

/** Error the tRPC client raises when the portal backend does not have a procedure. */
export function missingProcedure(pathName: string) {
  return new TRPCClientError(`No procedure found on path "${pathName}"`);
}

/** `portal` is a partial stub of the tRPC client: only the procedures a test exercises. */
export async function connect(
  portal: object,
  options: { config?: Partial<Config>; tools?: ToolDefinition[]; fetch?: typeof fetch } = {}
) {
  const config = testConfig(options.config);
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerTools(server, options.tools ?? allTools, {
    portal: portal as unknown as PortalClient,
    config,
    fetch: options.fetch ?? globalThis.fetch,
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const text = (res.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // error messages are plain text
    }
    return { isError: Boolean(res.isError), text, data: data as any };
  };
  return { client, server, call, config };
}
