import os from "node:os";
import path from "node:path";

export type AuthMode = "session-token" | "admin-login";

export type Config = {
  /** Portal origin serving `/api/trpc` (the same backend the web app uses). */
  apiUrl: string;
  /** Public portal origin used when building client-facing links (share invites, project URLs). */
  publicUrl: string;
  authMode: AuthMode;
  sessionToken?: string;
  adminEmail?: string;
  adminPassword?: string;
  readOnly: boolean;
  /** Name shown as the commenter when the team posts a comment from MCP. */
  teamName: string;
  downloadDir: string;
  /** When non-empty, local file reads/writes must stay inside one of these directories. */
  fileRoots: string[];
  requestTimeoutMs: number;
};

export class ConfigError extends Error {}

function expandHome(p: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseBool(value: string | undefined): boolean {
  return value != null && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiUrl = trimTrailingSlash(env.MULTIWING_API_URL?.trim() || "http://localhost:3000");
  try {
    new URL(apiUrl);
  } catch {
    throw new ConfigError(`MULTIWING_API_URL is not a valid URL: ${apiUrl}`);
  }

  const sessionToken = env.MULTIWING_SESSION_TOKEN?.trim() || undefined;
  const adminEmail = env.MULTIWING_ADMIN_EMAIL?.trim() || undefined;
  const adminPassword = env.MULTIWING_ADMIN_PASSWORD || undefined;

  let authMode: AuthMode;
  if (sessionToken) authMode = "session-token";
  else if (adminEmail && adminPassword) authMode = "admin-login";
  else {
    throw new ConfigError(
      "No portal credentials configured. Set MULTIWING_SESSION_TOKEN, or MULTIWING_ADMIN_EMAIL and MULTIWING_ADMIN_PASSWORD."
    );
  }

  const timeout = Number(env.MULTIWING_REQUEST_TIMEOUT_MS ?? 60_000);

  return {
    apiUrl,
    publicUrl: trimTrailingSlash(env.MULTIWING_PUBLIC_URL?.trim() || apiUrl),
    authMode,
    sessionToken,
    adminEmail,
    adminPassword,
    readOnly: parseBool(env.MULTIWING_MCP_READ_ONLY),
    teamName: env.MULTIWING_TEAM_NAME?.trim() || "Faderlabs",
    downloadDir: path.resolve(expandHome(env.MULTIWING_DOWNLOAD_DIR?.trim() || path.join(os.homedir(), "Downloads", "multiwing"))),
    fileRoots: (env.MULTIWING_FILE_ROOTS ?? "")
      .split(path.delimiter)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => path.resolve(expandHome(p))),
    requestTimeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 60_000,
  };
}

export { expandHome };
