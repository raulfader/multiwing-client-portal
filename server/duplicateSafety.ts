/**
 * The isolated AWS duplicate is intentionally silent until a later explicit
 * activation gate. The original Manus portal has no DUPLICATE_MODE flag and
 * therefore retains its current email behavior.
 */
export function isExternalEmailAllowed(): boolean {
  if (process.env.DUPLICATE_MODE !== "true") return true;
  return process.env.CLIENT_EMAIL_ENABLED === "true";
}

export function externalEmailDisabledResult() {
  return {
    success: false as const,
    error: "External email is disabled in the isolated duplicate environment",
  };
}
