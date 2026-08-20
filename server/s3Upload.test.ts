import { describe, expect, it } from "vitest";

import { resolveS3Credentials } from "./s3Upload";

describe("resolveS3Credentials", () => {
  it("preserves the temporary session token required for Lambda-signed media URLs", () => {
    expect(
      resolveS3Credentials({
        AWS_ACCESS_KEY_ID: "temporary-access-key",
        AWS_SECRET_ACCESS_KEY: "temporary-secret",
        AWS_SESSION_TOKEN: "temporary-session-token",
      }),
    ).toEqual({
      accessKeyId: "temporary-access-key",
      secretAccessKey: "temporary-secret",
      sessionToken: "temporary-session-token",
    });
  });

  it("returns undefined when no explicit credentials are available", () => {
    expect(resolveS3Credentials({})).toBeUndefined();
  });
});
