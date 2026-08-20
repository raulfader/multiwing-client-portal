import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

const originalAdminEmail = process.env.ADMIN_EMAIL;
const originalAdminPassword = process.env.ADMIN_PASSWORD;
const originalPortalPassword = process.env.PORTAL_PASSWORD;

function restore(name: "ADMIN_EMAIL" | "ADMIN_PASSWORD" | "PORTAL_PASSWORD", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore("ADMIN_EMAIL", originalAdminEmail);
  restore("ADMIN_PASSWORD", originalAdminPassword);
  restore("PORTAL_PASSWORD", originalPortalPassword);
  vi.resetModules();
});

describe("isolated custom authentication", () => {
  it("uses administrator credentials hydrated after the authentication module is loaded", async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    vi.resetModules();

    const { checkAdminCredentials } = await import("./customAuth");

    process.env.ADMIN_EMAIL = "hello@faderlabs.com";
    process.env.ADMIN_PASSWORD = "dedicated-isolated-secret";

    expect(checkAdminCredentials("HELLO@FADERLABS.COM", "dedicated-isolated-secret")).toBe(true);
    expect(checkAdminCredentials("hello@faderlabs.com", "not-the-secret")).toBe(false);
  });

  it("uses a client password hydrated after the authentication module is loaded", async () => {
    delete process.env.PORTAL_PASSWORD;
    vi.resetModules();

    const { checkClientPassword } = await import("./customAuth");

    process.env.PORTAL_PASSWORD = "duplicate-client-secret";

    expect(checkClientPassword("duplicate-client-secret")).toBe(true);
    expect(checkClientPassword("MW@2025")).toBe(false);
  });
});
