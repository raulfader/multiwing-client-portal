export function isFrameIoShareUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "f.io" || host === "frame.io" || host.endsWith(".frame.io");
  } catch {
    return false;
  }
}

export function externalDeliverableActionLabel(url: string | null | undefined): string {
  return isFrameIoShareUrl(url) ? "Open in Frame.io" : "My Files";
}
