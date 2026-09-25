import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Parses KEY=VALUE lines (optional `export`, quotes, `#` comments). */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2];
    const quoted = value.match(/^(["'])([\s\S]*)\1$/);
    if (quoted) value = quoted[2];
    else value = value.replace(/\s+#.*$/, "").trim();
    out[match[1]] = value;
  }
  return out;
}

/** The package root (mcp-server/), both for dist/index.js and src/index.ts. */
export function packageDir(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

/**
 * Loads MULTIWING_ENV_FILE, or `<package>/.env` when present. Variables the MCP host
 * injects always win, so a host that only passes a subset still gets the rest from
 * the file. Returns the file used (never its contents) for diagnostics.
 */
export function loadEnvFile(env: NodeJS.ProcessEnv = process.env, defaultPath = path.join(packageDir(), ".env")) {
  const explicit = env.MULTIWING_ENV_FILE?.trim();
  const file = explicit || defaultPath;
  if (!fs.existsSync(file)) {
    return {
      file: explicit ? file : undefined,
      loaded: [] as string[],
      error: explicit ? `MULTIWING_ENV_FILE not found: ${file}` : undefined,
      warning: undefined as string | undefined,
    };
  }
  const parsed = parseEnvFile(fs.readFileSync(file, "utf8"));
  const loaded: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] === undefined || env[key] === "") {
      env[key] = value;
      loaded.push(key);
    }
  }
  // The file can hold an admin session token; POSIX group/other access is a leak risk.
  const insecure = process.platform !== "win32" && (fs.statSync(file).mode & 0o077) !== 0;
  const warning = insecure ? `${file} is readable by other users; run: chmod 600 '${file}'` : undefined;
  return { file, loaded, error: undefined, warning };
}
