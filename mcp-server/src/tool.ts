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
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<unknown>;
}): ToolDefinition {
  return def as unknown as ToolDefinition;
}

/** Required on destructive tools so an agent cannot delete data by accident. */
export const confirmFlag = z
  .literal(true)
  .describe("Must be true. Confirms you intend to perform this irreversible action.");

export const idSchema = z.number().int().positive();

export function toText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
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
        try {
          const result = await tool.handler(args, ctx);
          return { content: [{ type: "text" as const, text: toText(result ?? { success: true }) }] };
        } catch (err) {
          return { isError: true, content: [{ type: "text" as const, text: describeError(err) }] };
        }
      }
    );
    registered.push(tool.name);
  }
  return registered;
}
