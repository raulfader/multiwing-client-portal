import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { describeAuth, loadConfig, type Config } from "./config";
import { diagnose } from "./diagnostics";
import { loadEnvFile } from "./envFile";
import { CLIENT_VERSION, PortalSession } from "./portal";
import { createMcpServer } from "./server";
import { whenIdle } from "./tool";

// In MCP mode stdout carries only JSON-RPC frames; every diagnostic goes to stderr.
const log = (...args: unknown[]) => console.error("[multiwing-mcp]", ...args);

const HELP = `multiwing-mcp ${CLIENT_VERSION}: stdio MCP server for the Multi-Wing content hub.

Usage:
  node dist/index.js            Run as an MCP server over stdio (what MCP hosts launch)
  node dist/index.js --check    Verify config + portal auth, print a JSON report, exit 0 if OK
  node dist/index.js --version

Configuration comes from the environment, then mcp-server/.env (or MULTIWING_ENV_FILE)
for anything the host did not inject. See README.md.`;

function loadRuntimeConfig(): Config {
  const envFile = loadEnvFile();
  const config = loadConfig();
  if (envFile.error) config.problems.push(envFile.error);
  if (envFile.warning) config.warnings.push(envFile.warning);
  if (typeof AbortSignal.any !== "function") {
    config.problems.push(`Node.js ${process.version} is too old; this server needs Node.js >= 20.3 (set MULTIWING_NODE for run.sh).`);
  }
  if (envFile.file) config.envFile = { path: envFile.file, keys: envFile.loaded };
  return config;
}

async function check() {
  const config = loadRuntimeConfig();
  const session = new PortalSession(config);
  const report = await diagnose(config, session.client);
  await session.close();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.ok ? 0 : 1);
}

async function serve() {
  const config = loadRuntimeConfig();
  const { server, session, registered } = createMcpServer({ config });

  let closing = false;
  const shutdown = async (code = 0, drainMs = 0) => {
    if (closing) return;
    closing = true;
    if (drainMs > 0) {
      // Requests read in the same chunk as EOF may not have reached a tool handler yet.
      await new Promise((resolve) => setTimeout(resolve, 100));
      await whenIdle(drainMs);
    }
    await session.close();
    await server.close().catch(() => undefined);
    process.exit(code);
  };
  process.on("SIGINT", () => void shutdown(0, 2_000));
  process.on("SIGTERM", () => void shutdown(0, 2_000));
  // EOF on stdin: the host is done sending; finish replies already in progress.
  process.stdin.on("close", () => void shutdown(0, 10_000));
  // The host went away mid-write; nothing left to talk to.
  process.stdout.on("error", () => void shutdown());
  process.on("unhandledRejection", (reason) => log("unhandled rejection (continuing):", reason));
  process.on("uncaughtException", (err) => {
    log("uncaught exception:", err);
    void shutdown(1);
  });

  await server.connect(new StdioServerTransport());
  const source = config.envFile ? `, env file ${config.envFile.path} (${config.envFile.keys.length} vars)` : "";
  log(`ready: ${registered.length} tools, portal ${config.apiUrl}, auth ${describeAuth(config)}${config.readOnly ? ", read-only" : ""}${source}`);
  for (const w of config.warnings) log(`warning: ${w}`);
  for (const p of config.problems) log(`NOT CONFIGURED: ${p}`);
}

const arg = process.argv[2];
if (arg === "--help" || arg === "-h") {
  process.stdout.write(`${HELP}\n`);
} else if (arg === "--version" || arg === "-v") {
  process.stdout.write(`${CLIENT_VERSION}\n`);
} else if (arg === "--check") {
  check().catch((err) => {
    log(err);
    process.exit(1);
  });
} else {
  serve().catch((err) => {
    log("failed to start:", err);
    process.exit(1);
  });
}
