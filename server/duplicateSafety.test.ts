import { afterEach, describe, expect, it } from "vitest";
import { isExternalEmailAllowed } from "./duplicateSafety";

const originalDuplicateMode = process.env.DUPLICATE_MODE;
const originalEmailEnabled = process.env.CLIENT_EMAIL_ENABLED;

afterEach(() => {
  if (originalDuplicateMode === undefined) delete process.env.DUPLICATE_MODE;
  else process.env.DUPLICATE_MODE = originalDuplicateMode;
  if (originalEmailEnabled === undefined) delete process.env.CLIENT_EMAIL_ENABLED;
  else process.env.CLIENT_EMAIL_ENABLED = originalEmailEnabled;
});

describe("isExternalEmailAllowed", () => {
  it("preserves the untouched source runtime behavior", () => {
    delete process.env.DUPLICATE_MODE;
    delete process.env.CLIENT_EMAIL_ENABLED;
    expect(isExternalEmailAllowed()).toBe(true);
  });

  it("blocks all duplicate notifications until an explicit activation", () => {
    process.env.DUPLICATE_MODE = "true";
    process.env.CLIENT_EMAIL_ENABLED = "false";
    expect(isExternalEmailAllowed()).toBe(false);
  });

  it("requires an explicit enabled flag even in duplicate mode", () => {
    process.env.DUPLICATE_MODE = "true";
    process.env.CLIENT_EMAIL_ENABLED = "true";
    expect(isExternalEmailAllowed()).toBe(true);
  });
});
