import { describe, expect, it, vi } from "vitest";
import {
  applyMultiwingSchema,
  MULTIWING_SCHEMA_STATEMENTS,
} from "./schemaInitializer";

describe("applyMultiwingSchema", () => {
  it("executes every non-destructive table creation statement", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);

    const applied = await applyMultiwingSchema({ execute, end: vi.fn() });

    expect(applied).toBe(MULTIWING_SCHEMA_STATEMENTS.length);
    expect(execute).toHaveBeenCalledTimes(MULTIWING_SCHEMA_STATEMENTS.length);
    expect(MULTIWING_SCHEMA_STATEMENTS).toHaveLength(19);
    expect(MULTIWING_SCHEMA_STATEMENTS.every((statement) => statement.includes("CREATE TABLE IF NOT EXISTS"))).toBe(true);
  });

  it("stops immediately if the database rejects a schema statement", async () => {
    const execute = vi.fn().mockRejectedValueOnce(new Error("database unavailable"));

    await expect(applyMultiwingSchema({ execute, end: vi.fn() })).rejects.toThrow("database unavailable");
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
