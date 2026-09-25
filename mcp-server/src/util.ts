import path from "node:path";
import { z } from "zod";

const RELATIVE_SINCE = /^(\d+)\s*(m|h|d|w)$/i;
const UNIT_MS: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

export const sinceSchema = z
  .string()
  .describe('Only include items after this point. ISO 8601 timestamp (e.g. "2026-09-01T00:00:00Z") or relative window like "30m", "24h", "7d", "2w".');

export function parseSince(value: string | undefined, now = Date.now()): Date | undefined {
  if (!value) return undefined;
  const rel = value.trim().match(RELATIVE_SINCE);
  if (rel) return new Date(now - Number(rel[1]) * UNIT_MS[rel[2].toLowerCase()]);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid "since" value: ${value}`);
  return date;
}

export function stripExtension(fileName: string): string {
  const ext = path.extname(fileName);
  return ext ? fileName.slice(0, -ext.length) : fileName;
}

/** Drops undefined keys; throws if nothing is left to update. */
export function compactUpdate<T extends Record<string, unknown>>(fields: T): Partial<T> {
  const out = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as Partial<T>;
  if (Object.keys(out).length === 0) throw new Error("Nothing to update: provide at least one field to change.");
  return out;
}

/** Accepts either a raw share token or a full `/share/<token>` URL. */
export function extractShareToken(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/\/share\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : trimmed;
}
