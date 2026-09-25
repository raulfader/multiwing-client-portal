import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config";
import { PortalSession } from "./portal";
import { registerTools, type ToolDefinition } from "./tool";
import { allTools } from "./tools";

export const SERVER_NAME = "multiwing-content-hub";
export const SERVER_VERSION = "0.1.0";

const INSTRUCTIONS = `Operate the Multi-Wing client content hub (multiwing.faderlabs.ai) as a Faderlabs admin.
Projects contain deliverables (files or links); clients comment on deliverables and set review status (pending / approved / needs_changes).
Start with get_review_summary or list_review_comments to see what needs attention. Reply with reply_to_comment.
Use upload_file_to_project / download_deliverable_file for files and notify_project_finished (try dryRun first) when a project is done.
Destructive tools require confirm=true. Emails go to real clients: confirm recipients before sending.`;

export function createMcpServer(options: {
  config: Config;
  session?: PortalSession;
  tools?: ToolDefinition[];
  fetch?: typeof fetch;
}) {
  const session = options.session ?? new PortalSession(options.config, options.fetch);
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS });
  const registered = registerTools(server, options.tools ?? allTools, {
    portal: session.client,
    config: options.config,
    fetch: options.fetch ?? globalThis.fetch,
  });
  return { server, session, registered };
}
