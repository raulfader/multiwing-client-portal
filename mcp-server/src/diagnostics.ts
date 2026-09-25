import { describeAuth, type Config } from "./config";
import { CLIENT_VERSION, describeError, type PortalClient } from "./portal";

export type Diagnosis = {
  ok: boolean;
  version: string;
  node: string;
  apiUrl: string;
  publicUrl: string;
  auth: string;
  readOnly: boolean;
  fileRoots: string[] | "unrestricted";
  downloadDir: string;
  envFile: Config["envFile"] | null;
  problems: string[];
  warnings: string[];
  session: { role: string; isGuest: boolean } | null;
  error?: string;
  next?: string;
};

/** Connection report shared by the whoami tool and `--check`. Contains no secret values. */
export async function diagnose(config: Config, portal: PortalClient): Promise<Diagnosis> {
  const base = {
    version: CLIENT_VERSION,
    node: process.version,
    apiUrl: config.apiUrl,
    publicUrl: config.publicUrl,
    auth: describeAuth(config),
    readOnly: config.readOnly,
    fileRoots: config.fileRoots.length ? config.fileRoots : ("unrestricted" as const),
    downloadDir: config.downloadDir,
    envFile: config.envFile ?? null,
    problems: config.problems,
    warnings: config.warnings,
  };
  if (config.problems.length > 0) {
    return { ...base, ok: false, session: null, next: "Fix the problems above in the MCP server env (or mcp-server/.env) and restart the server." };
  }
  try {
    // auth.me is public and returns null for unknown tokens, so probe an admin procedure to trigger re-login when needed.
    await portal.projects.listAdmin.query();
    const session = await portal.auth.me.query();
    const ok = session?.role === "admin";
    return {
      ...base,
      ok,
      session,
      ...(ok ? {} : { next: "The session is not an admin session. Use an admin session token (log in at /admin) or admin credentials." }),
    };
  } catch (err) {
    const session = await portal.auth.me.query().catch(() => null);
    return { ...base, ok: false, session, error: describeError(err, config) };
  }
}
