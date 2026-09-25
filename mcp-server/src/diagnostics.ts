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
  backend: BackendFeatures;
  error?: string;
  next?: string;
};

export type BackendFeatures = {
  /** ops.* / byId procedures from PR #1. `null` = could not tell. */
  opsRouter: boolean | null;
  note: string;
};

/**
 * The deployed portal (Manus-published checkpoint) can differ from git, so detect
 * capabilities instead of assuming them. Unauthenticated GET: tRPC answers 404
 * "No procedure found" for unknown paths and 403 from the admin guard before any
 * input parsing or DB access for known ones.
 */
export async function probeBackend(config: Config, fetchImpl: typeof fetch = globalThis.fetch): Promise<BackendFeatures> {
  try {
    const res = await fetchImpl(`${config.apiUrl}/api/trpc/ops.search`, { signal: AbortSignal.timeout(5_000) });
    const body = await res.text();
    if (res.status === 404 && /No procedure found/.test(body)) {
      return {
        opsRouter: false,
        note: "Deployed portal predates this repo's ops router: search_hub and list_activity are unavailable; other tools use fallbacks.",
      };
    }
    if (res.status === 401 || res.status === 403) return { opsRouter: true, note: "Deployed portal includes the ops router." };
    return { opsRouter: null, note: `Unexpected probe response (HTTP ${res.status}).` };
  } catch {
    return { opsRouter: null, note: "Could not probe the deployed portal's capabilities." };
  }
}

/** Connection report shared by the whoami tool and `--check`. Contains no secret values. */
export async function diagnose(config: Config, portal: PortalClient, fetchImpl: typeof fetch = globalThis.fetch): Promise<Diagnosis> {
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
    const backend: BackendFeatures = { opsRouter: null, note: "Not probed: configuration problems." };
    return { ...base, ok: false, session: null, backend, next: "Fix the problems above in the MCP server env (or mcp-server/.env) and restart the server." };
  }
  const backend = await probeBackend(config, fetchImpl);
  try {
    // auth.me is public and returns null for unknown tokens, so probe an admin procedure to trigger re-login when needed.
    await portal.projects.listAdmin.query();
    const session = await portal.auth.me.query();
    const ok = session?.role === "admin";
    return {
      ...base,
      ok,
      session,
      backend,
      ...(ok ? {} : { next: "The session is not an admin session. Use an admin session token (log in at /admin) or admin credentials." }),
    };
  } catch (err) {
    const session = await portal.auth.me.query().catch(() => null);
    return { ...base, ok: false, session, backend, error: describeError(err, config) };
  }
}
