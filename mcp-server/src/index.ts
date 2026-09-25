import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConfigError, loadConfig } from "./config";
import { createMcpServer } from "./server";

// stdout carries the MCP protocol; all diagnostics must go to stderr.
const log = (...args: unknown[]) => console.error("[multiwing-mcp]", ...args);

async function main() {
  const config = loadConfig();
  const { server, session, registered } = createMcpServer({ config });

  let closing = false;
  const shutdown = async (code = 0) => {
    if (closing) return;
    closing = true;
    await session.close();
    await server.close().catch(() => undefined);
    process.exit(code);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  process.stdin.on("close", () => void shutdown());

  await server.connect(new StdioServerTransport());
  log(
    `ready: ${registered.length} tools, portal ${config.apiUrl}, auth ${config.authMode}${config.readOnly ? ", read-only" : ""}`
  );
}

main().catch((err) => {
  log(err instanceof ConfigError ? err.message : err);
  process.exit(1);
});
