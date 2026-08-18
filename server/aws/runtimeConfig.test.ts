import { describe, expect, it } from "vitest";
import { createDatabaseUrlFromRdsSecret } from "./runtimeConfig";

describe("createDatabaseUrlFromRdsSecret", () => {
  it("uses the stack endpoint fallback for credential-only RDS secrets", () => {
    expect(
      createDatabaseUrlFromRdsSecret(
        { username: "multiwing_admin", password: "pa:ss@word" },
        {
          host: "multiwing.cluster.local",
          port: "3306",
          database: "multiwing",
        }
      )
    ).toBe(
      "mysql://multiwing_admin:pa%3Ass%40word@multiwing.cluster.local:3306/multiwing"
    );
  });

  it("rejects incomplete RDS configuration without exposing credentials", () => {
    expect(() =>
      createDatabaseUrlFromRdsSecret({ username: "admin", password: "secret" })
    ).toThrow("RDS master secret and endpoint configuration are incomplete");
  });
});
