import os from "node:os";
import path from "node:path";

export type AuthMode = "session-token" | "admin-login" | "none";

export type Config = {
  /** Portal origin serving `/api/trpc` (the same backend the web app uses). */
  apiUrl: string;
  /** Public portal origin used when building client-facing links (share invites, project URLs). */
  publicUrl: string;
  /** Primary auth mode. "none" means tools report `problems` instead of calling the portal. */
  authMode: AuthMode;
  sessionToken?: string;
  adminEmail?: string;
  adminPassword?: string;
  readOnly: boolean;
  /** Name shown as the commenter when the team posts a comment from MCP. */
  teamName: string;
  downloadDir: string;
  /** Local file reads/writes must stay inside one of these directories; empty = unrestricted. */
  fileRoots: string[];
  requestTimeoutMs: number;
  /** Blocking configuration problems. Tools refuse to run while this is non-empty. */
  problems: string[];
  /** Non-blocking notes surfaced by whoami / --check. */
  warnings: string[];
  /** Env file that supplied variables the host did not inject (names only, never values). */
  envFile?: { path: string; keys: string[] };
};

function expandHome(p: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseBool(value: string | undefined): boolean {
  return value != null && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

/** Tokens copied from browser devtools usually arrive wrapped in quotes. */
function cleanToken(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return trimmed || undefined;
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "::1" || hostname === "[::1]" || /^127\./.test(hostname);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problems: string[] = [];
  const warnings: string[] = [];

  const rawApiUrl = env.MULTIWING_API_URL?.trim();
  if (!rawApiUrl) warnings.push("MULTIWING_API_URL is not set; defaulting to http://localhost:3000.");
  const apiUrl = trimTrailingSlash(rawApiUrl || "http://localhost:3000");
  let parsedApi: URL | undefined;
  try {
    parsedApi = new URL(apiUrl);
  } catch {
    problems.push(`MULTIWING_API_URL is not a valid URL: ${apiUrl}`);
  }

  const sessionToken = cleanToken(env.MULTIWING_SESSION_TOKEN);
  const adminEmail = env.MULTIWING_ADMIN_EMAIL?.trim() || undefined;
  const adminPassword = env.MULTIWING_ADMIN_PASSWORD || undefined;
  const hasAdminLogin = Boolean(adminEmail && adminPassword);

  let authMode: AuthMode = sessionToken ? "session-token" : hasAdminLogin ? "admin-login" : "none";
  if (authMode === "none") {
    const hints = ["No admin credentials configured. Set MULTIWING_SESSION_TOKEN (an admin browser session token), or MULTIWING_ADMIN_EMAIL and MULTIWING_ADMIN_PASSWORD."];
    if (env.MULTIWING_PORTAL_PASSWORD || env.PORTAL_PASSWORD) {
      hints.push("MULTIWING_PORTAL_PASSWORD / PORTAL_PASSWORD is the shared *client* portal password; it cannot authorize the admin tools this server exposes.");
    }
    if (adminEmail && !adminPassword) hints.push("MULTIWING_ADMIN_EMAIL is set but MULTIWING_ADMIN_PASSWORD is missing.");
    if (!adminEmail && adminPassword) hints.push("MULTIWING_ADMIN_PASSWORD is set but MULTIWING_ADMIN_EMAIL is missing.");
    problems.push(hints.join(" "));
  }

  if (parsedApi && parsedApi.protocol === "http:" && !isLoopback(parsedApi.hostname) && authMode !== "none") {
    if (parseBool(env.MULTIWING_ALLOW_INSECURE_HTTP)) {
      warnings.push(`Sending portal credentials over plain HTTP to ${parsedApi.host} (MULTIWING_ALLOW_INSECURE_HTTP is set).`);
    } else {
      problems.push(`Refusing to send portal credentials over plain HTTP to ${parsedApi.host}. Use https:// or set MULTIWING_ALLOW_INSECURE_HTTP=true for a trusted network.`);
    }
  }

  const timeout = Number(env.MULTIWING_REQUEST_TIMEOUT_MS ?? 60_000);
  const downloadDir = path.resolve(expandHome(env.MULTIWING_DOWNLOAD_DIR?.trim() || path.join(os.homedir(), "Downloads", "multiwing")));
  const rootsSetting = env.MULTIWING_FILE_ROOTS?.trim();
  const fileRoots =
    rootsSetting === "*"
      ? []
      : rootsSetting
        ? rootsSetting.split(path.delimiter).map((p) => p.trim()).filter(Boolean).map((p) => path.resolve(expandHome(p)))
        : [downloadDir];
  if (rootsSetting === "*") warnings.push("MULTIWING_FILE_ROOTS=* lets tools read and write any local path this user can access.");

  return {
    apiUrl,
    publicUrl: trimTrailingSlash(env.MULTIWING_PUBLIC_URL?.trim() || apiUrl),
    authMode,
    sessionToken,
    adminEmail,
    adminPassword,
    readOnly: parseBool(env.MULTIWING_MCP_READ_ONLY),
    teamName: env.MULTIWING_TEAM_NAME?.trim() || "Faderlabs",
    downloadDir,
    fileRoots,
    requestTimeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 60_000,
    problems,
    warnings,
  };
}

export function hasAdminLogin(config: Config): boolean {
  return Boolean(config.adminEmail && config.adminPassword);
}

/** Human-readable auth description that never includes secret values. */
export function describeAuth(config: Config): string {
  if (config.authMode === "session-token") {
    return hasAdminLogin(config) ? "session-token (falls back to admin-login)" : "session-token";
  }
  return config.authMode;
}

export { expandHome };
