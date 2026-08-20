export type PrivateMediaReference = {
  fileKey?: string | null;
  proxyKey?: string | null;
  proxyStatus?: string | null;
};

/**
 * Select the private object to stream without exposing a bucket URL to the browser.
 * A ready proxy is preferred because it is browser-compatible; all other media falls
 * back to the original copied object.
 */
export function selectPrivatePlaybackKey(media: PrivateMediaReference): string | null {
  if (media.proxyStatus === "ready" && media.proxyKey) return media.proxyKey;
  return media.fileKey ?? null;
}
