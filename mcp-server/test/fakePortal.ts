import http from "node:http";
import type { AddressInfo } from "node:net";

export type FakeCall = { path: string; token: string | null; userAgent: string | undefined };

/**
 * Minimal HTTP stand-in for the portal's tRPC endpoint that reproduces its auth
 * semantics: auth.me is public (null for unknown tokens), protected procedures
 * return 401 "(10001)", admin procedures return 403 "(10002)" (server/_core/trpc.ts).
 */
export async function startFakePortal(options: { adminPassword?: string; tokens?: Record<string, "admin" | "client"> } = {}) {
  const tokens = new Map(Object.entries(options.tokens ?? {}));
  const calls: FakeCall[] = [];
  let issued = 0;

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://fake");
      const path = url.pathname.replace(/^\/api\/trpc\//, "");
      const token = (req.headers["x-session-token"] as string | undefined) ?? null;
      calls.push({ path, token, userAgent: req.headers["user-agent"] });
      const input = req.method === "POST" ? JSON.parse(Buffer.concat(chunks).toString() || "{}").json : undefined;
      const role = token ? tokens.get(token) : undefined;

      const send = (status: number, body: unknown) => {
        res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
      };
      const ok = (data: unknown) => send(200, { result: { data: { json: data } } });
      const fail = (status: number, code: string, message: string) =>
        send(status, { error: { json: { message, code: -32000, data: { code, httpStatus: status, path } } } });

      switch (path) {
        case "auth.adminLogin": {
          if (!options.adminPassword || input?.password !== options.adminPassword) return fail(401, "UNAUTHORIZED", "Invalid admin credentials");
          const t = `login-${++issued}`;
          tokens.set(t, "admin");
          return ok({ success: true, role: "admin", token: t });
        }
        case "auth.logout":
          if (token) tokens.delete(token);
          return ok({ success: true });
        case "auth.me":
          return ok(role ? { role, isGuest: false } : null);
        case "projects.list":
          return role ? ok([]) : fail(401, "UNAUTHORIZED", "Please login (10001)");
        case "projects.listAdmin":
          return role === "admin" ? ok([{ id: 1, title: "Launch", slug: "launch", isPublished: 1, projectStatus: "started", category: "video" }]) : fail(403, "FORBIDDEN", "You do not have required permission (10002)");
        case "shares.requestOtp":
          return fail(403, "FORBIDDEN", "Email does not match the share invitation");
        default:
          return fail(404, "NOT_FOUND", `No procedure found on path "${path}"`);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    url,
    calls,
    tokens,
    paths: () => calls.map((c) => c.path),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
