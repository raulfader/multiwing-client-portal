import { describe, expect, it } from "vitest";
import { selectPrivatePlaybackKey } from "./privateMediaPlayback";

describe("selectPrivatePlaybackKey", () => {
  it("uses a ready private proxy for browser playback", () => {
    expect(selectPrivatePlaybackKey({ fileKey: "private/original.mov", proxyKey: "private/proxy.mp4", proxyStatus: "ready" })).toBe("private/proxy.mp4");
  });

  it("falls back to the private original when no ready proxy exists", () => {
    expect(selectPrivatePlaybackKey({ fileKey: "private/original.mp4", proxyKey: "private/proxy.mp4", proxyStatus: "processing" })).toBe("private/original.mp4");
  });

  it("does not invent a public URL when no isolated key exists", () => {
    expect(selectPrivatePlaybackKey({ proxyStatus: "ready" })).toBeNull();
  });
});
