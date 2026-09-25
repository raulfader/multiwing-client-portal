import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "./config";
import { describeError, type PortalClient } from "./portal";

export type ToolContext = {
  portal: PortalClient;
  config: Config;
  fetch: typeof fetch;
};

type Shape = Record<string, z.ZodType>;

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  /** Read-only tools never change portal data; only these are exposed when MULTIWING_MCP_READ_ONLY is set. */
  readOnly: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  /** Diagnostic tools that must work (and explain the problem) while configuration is incomplete. */
  allowWithConfigProblems?: boolean;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

export function defineTool<S extends Shape>(def: {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  readOnly: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  allowWithConfigProblems?: boolean;
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<unknown>;
}): ToolDefinition {
  return def as unknown as ToolDefinition;
}

/** Required on destructive tools so an agent cannot delete data by accident. */
export const confirmFlag = z
  .literal(true)
  .describe("Must be true. Confirms you intend to perform this irreversible action.");

/** For tools that email people outside Faderlabs or grant access; checked in the handler so previews stay possible. */
export const sendConfirmFlag = z
  .boolean()
  .optional()
  .describe("Must be true to actually send / grant. Emails and access grants reach real clients and cannot be recalled.");

export function requireConfirm(confirm: boolean | undefined, action: string) {
  if (confirm !== true) {
    throw new Error(`Not done: ${action} affects people outside Faderlabs. Re-run with confirm: true once the recipients are correct.`);
  }
}

export const idSchema = z.number().int().positive();

export function toText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export function configProblemMessage(config: Config): string {
  return `The Multi-Wing MCP server is running but not configured, so it cannot call the portal:\n- ${config.problems.join("\n- ")}\nFix the MCP server's env (or mcp-server/.env) and restart it. Run the whoami tool for details.`;
}

let inFlight = 0;
const idleWaiters = new Set<() => void>();

/** Resolves once no tool call is running (or after timeoutMs), so shutdown doesn't drop replies. */
export function whenIdle(timeoutMs: number): Promise<void> {
  if (inFlight === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      idleWaiters.delete(done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    idleWaiters.add(done);
  });
}

export function registerTools(server: McpServer, tools: ToolDefinition[], ctx: ToolContext) {
  const registered: string[] = [];
  for (const tool of tools) {
    if (ctx.config.readOnly && !tool.readOnly) continue;
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          title: tool.title,
          readOnlyHint: tool.readOnly,
          destructiveHint: tool.destructive ?? false,
          idempotentHint: tool.idempotent ?? tool.readOnly,
          openWorldHint: true,
        },
      },
      async (args: Record<string, unknown>) => {
        if (ctx.config.problems.length > 0 && !tool.allowWithConfigProblems) {
          return { isError: true, content: [{ type: "text" as const, text: configProblemMessage(ctx.config) }] };
        }
        inFlight++;
        try {
          const result = await tool.handler(args, ctx);
          return { content: [{ type: "text" as const, text: toText(result ?? { success: true }) }] };
        } catch (err) {
          return { isError: true, content: [{ type: "text" as const, text: describeError(err, ctx.config) }] };
        } finally {
          inFlight--;
          // Let the SDK write this reply before shutdown proceeds.
          if (inFlight === 0) setImmediate(() => idleWaiters.forEach((w) => w()));
        }
      }
    );
    registered.push(tool.name);
  }
  return registered;
}
