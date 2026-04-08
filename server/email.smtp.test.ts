import { describe, it, expect } from "vitest";
import { verifySMTP } from "./email";

describe("SMTP credentials", () => {
  it("should connect to Gmail SMTP successfully", async () => {
    const ok = await verifySMTP();
    expect(ok).toBe(true);
  }, 15000);
});
