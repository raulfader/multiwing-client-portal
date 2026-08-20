import { describe, expect, it } from "vitest";
import { externalDeliverableActionLabel, isFrameIoShareUrl } from "../client/src/lib/externalMedia";

describe("immutable external media links", () => {
  it("recognizes a short Frame.io share URL without resolving or fetching it", () => {
    expect(isFrameIoShareUrl("https://f.io/example-share")).toBe(true);
    expect(externalDeliverableActionLabel("https://f.io/example-share")).toBe("Open in Frame.io");
  });

  it("keeps non-Frame.io legacy URLs on the existing generic external-link path", () => {
    expect(isFrameIoShareUrl("https://example.test/file")).toBe(false);
    expect(externalDeliverableActionLabel("https://example.test/file")).toBe("My Files");
  });
});
