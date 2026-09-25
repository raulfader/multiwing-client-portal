import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../server/routers";
import type { Config } from "./config";

export type PortalClient = ReturnType<typeof createTRPCClient<AppRouter>>;
type FetchLike = typeof fetch;

/** Header the portal's tRPC context reads the session token from (server/_core/context.ts). */
const SESSION_HEADER = "x-session-token";

/**
 * Authenticated connection to the portal's tRPC API.
 *
 * Uses the portal's existing admin session model: either a pre-issued session
 * token, or `auth.adminLogin` with the admin credentials (re-run once if the
 * session expires mid-run).
 */
export class PortalSession {
  readonly client: PortalClient;
  private token: string | undefined;
  private pendingLogin: Promise<string> | undefined;
  private issuedByLogin = false;

  constructor(
    private readonly config: Config,
    private readonly fetchImpl: FetchLike = globalThis.fetch
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

  get authMode() {
    return this.config.authMode;
  }

  private anonymousClient() {
    return createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: `${this.config.apiUrl}/api/trpc`,
          transformer: superjson,
          fetch: (url, init) =>
            this.fetchImpl(url, { ...init, signal: AbortSignal.timeout(this.config.requestTimeoutMs) } as RequestInit),
        }),
      ],
    });
  }

  private async login(): Promise<string> {
    if (this.config.authMode !== "admin-login") {
      throw new Error("Session token rejected by the portal. Issue a new MULTIWING_SESSION_TOKEN.");
    }
    this.pendingLogin ??= this.anonymousClient()
      .auth.adminLogin.mutate({ email: this.config.adminEmail!, password: this.config.adminPassword! })
      .then(({ token }) => {
        this.token = token;
        this.issuedByLogin = true;
        return token;
      })
      .finally(() => {
        this.pendingLogin = undefined;
      });
    return this.pendingLogin;
  }

  private async currentToken(): Promise<string> {
    return this.token ?? (await this.login());
  }

  private async send(url: string | URL | Request, init: RequestInit | undefined, token: string) {
    const headers = new Headers(init?.headers);
    headers.set(SESSION_HEADER, token);
    const signals = [AbortSignal.timeout(this.config.requestTimeoutMs), init?.signal].filter(
      (s): s is AbortSignal => s != null
    );
    return this.fetchImpl(url, { ...init, headers, signal: AbortSignal.any(signals) });
  }

  private async authedFetch(url: string | URL | Request, init?: RequestInit | null): Promise<Response> {
    const requestInit = init ?? undefined;
    const token = await this.currentToken();
    const res = await this.send(url, requestInit, token);
    if (res.status !== 401 || this.config.authMode !== "admin-login") return res;
    // Session expired or was pruned server-side: log in again once and retry.
    if (this.token === token) this.token = undefined;
    return this.send(url, requestInit, await this.currentToken());
  }

  /** Ends the session on the portal if this process created it via admin login. */
  async close(): Promise<void> {
    if (!this.issuedByLogin || !this.token) return;
    try {
      await this.client.auth.logout.mutate();
    } catch {
      // Best effort: sessions also expire server-side after 30 days.
    } finally {
      this.token = undefined;
      this.issuedByLogin = false;
    }
  }
}

export function isMissingProcedure(err: unknown): boolean {
  return err instanceof TRPCClientError && /No procedure found on path/i.test(err.message);
}

export function describeError(err: unknown): string {
  if (isMissingProcedure(err)) {
    return `${(err as Error).message}. The portal at MULTIWING_API_URL is running an older backend that predates this MCP tool; deploy the backend from this repository (server/routers/ops.ts) to enable it.`;
  }
  if (err instanceof TRPCClientError) {
    const code = (err.data as { code?: string } | undefined)?.code;
    return code ? `${code}: ${err.message}` : err.message;
  }
  if (err instanceof Error) {
    if (err.name === "TimeoutError") return "Request to the portal timed out.";
    return err.message;
  }
  return String(err);
}
