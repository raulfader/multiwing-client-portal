import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../server/routers";
import { hasAdminLogin, type Config } from "./config";

export type PortalClient = ReturnType<typeof createTRPCClient<AppRouter>>;
type FetchLike = typeof fetch;

export const CLIENT_VERSION = "0.2.0";
/** Header the portal's tRPC context reads the session token from (server/_core/context.ts). */
const SESSION_HEADER = "x-session-token";
const USER_AGENT = `multiwing-mcp/${CLIENT_VERSION}`;
/** Credentials come from static env, so a rejected login is not retried for a while. */
const LOGIN_FAILURE_BACKOFF_MS = 60_000;
const LOGOUT_TIMEOUT_MS = 2_000;

/**
 * Authenticated connection to the portal's tRPC API.
 *
 * Uses the portal's existing admin session model: a pre-issued session token
 * and/or `auth.adminLogin` with the admin credentials. Missing or expired
 * sessions surface as 401 on protected procedures and 403 on admin procedures
 * (server/_core/trpc.ts), so both trigger one fresh admin login when admin
 * credentials are configured.
 */
export class PortalSession {
  readonly client: PortalClient;
  private token: string | undefined;
  private pendingLogin: Promise<string> | undefined;
  private loginFailure: { error: Error; at: number } | undefined;
  private issuedByLogin = false;

  constructor(
    private readonly config: Config,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
    private readonly now: () => number = Date.now
  ) {
    this.token = config.sessionToken;
    this.client = createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: `${config.apiUrl}/api/trpc`,
          transformer: superjson,
          fetch: (url, init) => this.authedFetch(url, init),
        }),
      ],
    });
  }

  private anonymousClient() {
    return createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: `${this.config.apiUrl}/api/trpc`,
          transformer: superjson,
          fetch: (url, init) => this.send(url, init ?? undefined, undefined),
        }),
      ],
    });
  }

  private async login(): Promise<string> {
    if (!hasAdminLogin(this.config)) {
      throw new Error(
        "The portal rejected MULTIWING_SESSION_TOKEN (expired, revoked, or not an admin session). Log in at /admin and copy a fresh portal_session_token, or also set MULTIWING_ADMIN_EMAIL / MULTIWING_ADMIN_PASSWORD."
      );
    }
    if (this.loginFailure && this.now() - this.loginFailure.at < LOGIN_FAILURE_BACKOFF_MS) {
      throw this.loginFailure.error;
    }
    this.pendingLogin ??= this.anonymousClient()
      .auth.adminLogin.mutate({ email: this.config.adminEmail!, password: this.config.adminPassword! })
      .then(({ token }) => {
        this.token = token;
        this.issuedByLogin = true;
        this.loginFailure = undefined;
        return token;
      })
      .catch((err: unknown) => {
        if (err instanceof TRPCClientError && (err.data as { code?: string } | undefined)?.code === "UNAUTHORIZED") {
          this.loginFailure = { error: err, at: this.now() };
        }
        throw err;
      })
      .finally(() => {
        this.pendingLogin = undefined;
      });
    return this.pendingLogin;
  }

  private async currentToken(): Promise<string> {
    return this.token ?? (await this.login());
  }

  private send(url: string | URL | Request, init: RequestInit | undefined, token: string | undefined, timeoutMs = this.config.requestTimeoutMs) {
    const headers = new Headers(init?.headers);
    if (token) headers.set(SESSION_HEADER, token);
    headers.set("user-agent", USER_AGENT);
    const signals = [AbortSignal.timeout(timeoutMs), init?.signal].filter((s): s is AbortSignal => s != null);
    return this.fetchImpl(url, { ...init, headers, signal: AbortSignal.any(signals) });
  }

  private async authedFetch(url: string | URL | Request, init?: RequestInit | null): Promise<Response> {
    const requestInit = init ?? undefined;
    const token = await this.currentToken();
    const res = await this.send(url, requestInit, token);
    if (!hasAdminLogin(this.config) || !(await isSessionFailure(res))) return res;
    if (this.token && this.token !== token) return this.send(url, requestInit, this.token);
    if (this.token === token) {
      this.token = undefined;
      this.issuedByLogin = false;
    }
    return this.send(url, requestInit, await this.currentToken());
  }

  /** Ends the session on the portal if this process created it via admin login. Never blocks shutdown for long. */
  async close(): Promise<void> {
    if (!this.issuedByLogin || !this.token) return;
    const token = this.token;
    this.token = undefined;
    this.issuedByLogin = false;
    try {
      await this.send(`${this.config.apiUrl}/api/trpc/auth.logout`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, token, LOGOUT_TIMEOUT_MS);
    } catch {
      // Best effort: sessions also expire server-side after 30 days.
    }
  }
}

/** UNAUTHED_ERR_MSG (10001) / NOT_ADMIN_ERR_MSG (10002) from shared/const.ts, as opposed to business-rule FORBIDDENs. */
async function isSessionFailure(res: Response): Promise<boolean> {
  if (res.status !== 401 && res.status !== 403) return false;
  const body = await res.clone().text().catch(() => "");
  return /\((10001|10002)\)/.test(body);
}

export function isMissingProcedure(err: unknown): boolean {
  return err instanceof TRPCClientError && /No procedure found on path/i.test(err.message);
}

function networkCause(err: unknown): string | undefined {
  let current: unknown = err;
  let deepest: string | undefined;
  for (let depth = 0; current && depth < 5; depth++) {
    const e = current as { code?: string; message?: string; cause?: unknown; name?: string };
    if (e.name === "TimeoutError") return "request timed out";
    if (e.code && /^E[A-Z]+/.test(e.code)) return e.code;
    if (e.message) deepest = e.message;
    current = e.cause;
  }
  return deepest;
}

export function describeError(err: unknown, config?: Pick<Config, "apiUrl">): string {
  if (isMissingProcedure(err)) {
    return `${(err as Error).message}. The portal at MULTIWING_API_URL is running an older backend that predates this MCP tool; deploy the backend from this repository (server/routers/ops.ts) to enable it.`;
  }
  if (err instanceof TRPCClientError) {
    const code = (err.data as { code?: string } | undefined)?.code;
    if (!code && /fetch failed|timed out|aborted/i.test(err.message)) {
      const cause = networkCause(err) ?? err.message;
      return `Could not reach the portal${config ? ` at ${config.apiUrl}` : ""} (${cause}). Check MULTIWING_API_URL and network access.`;
    }
    let hint = "";
    if (/Invalid admin credentials/i.test(err.message)) {
      hint =
        " MULTIWING_ADMIN_EMAIL / MULTIWING_ADMIN_PASSWORD do not match what the running portal loaded (email and password must both match). On the Manus-hosted site that is the value from its last restart/publish, which can differ from the Manus secrets panel. Prefer MULTIWING_SESSION_TOKEN copied from a browser /admin session on the same site.";
    } else if (/\(10001\)/.test(err.message)) {
      hint = " The session token is missing, expired, or revoked.";
    } else if (/\(10002\)/.test(err.message)) {
      hint = " This session is not an admin session (a client-password or guest token, or an expired token). Use an admin session token.";
    }
    return `${code ? `${code}: ` : ""}${err.message}${hint ? `.${hint}` : ""}`;
  }
  if (err instanceof Error) {
    if (err.name === "TimeoutError") return "Request to the portal timed out.";
    return err.message;
  }
  return String(err);
}
