import { describe, expect, it } from "vitest";
import { allTools } from "../src/tools";
import { connect } from "./helpers";

describe("tool registry", () => {
  it("has unique snake_case tool names", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("covers the core content-hub workflows", () => {
    const names = new Set(allTools.map((t) => t.name));
    for (const required of [
      "list_review_comments",
      "reply_to_comment",
      "upload_file_to_project",
      "download_deliverable_file",
      "get_review_summary",
      "create_project",
      "notify_project_finished",
    ]) {
      expect(names.has(required), required).toBe(true);
    }
  });

  it("requires confirm on destructive tools and on tools that email outsiders or grant access", () => {
    const external = ["send_project_notification", "notify_project_finished", "share_project", "resend_share_verification_code"];
    for (const tool of allTools.filter((t) => t.destructive || external.includes(t.name))) {
      expect(Object.keys(tool.inputSchema), tool.name).toContain("confirm");
    }
  });

  it("only whoami runs while the server is misconfigured", () => {
    expect(allTools.filter((t) => t.allowWithConfigProblems).map((t) => t.name)).toEqual(["whoami"]);
  });

  it("never marks a mutating tool as read-only", () => {
    for (const tool of allTools.filter((t) => t.readOnly)) {
      expect(tool.destructive ?? false, tool.name).toBe(false);
      expect(tool.name, tool.name).not.toMatch(/^(create|update|delete|set|add|remove|reply|resolve|reopen|upload|send|notify|share|revoke|submit|attach|reorder|retranscode)_/);
    }
  });

  it("exposes every tool with a JSON schema over MCP", async () => {
    const { client } = await connect({});
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(allTools.length);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.description?.length ?? 0).toBeGreaterThan(10);
    }
  });

  it("only registers read-only tools in read-only mode", async () => {
    const { client } = await connect({}, { config: { readOnly: true } });
    const { tools } = await client.listTools();
    expect(tools.length).toBe(allTools.filter((t) => t.readOnly).length);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
    expect(tools.map((t) => t.name)).not.toContain("delete_project");
  });

  it("rejects destructive calls without confirm", async () => {
    let deleted = false;
    const { call } = await connect({ projects: { delete: { mutate: async () => { deleted = true; return { success: true }; } } } });
    const res = await call("delete_project", { projectId: 1 });
    expect(res.isError).toBe(true);
    expect(deleted).toBe(false);
  });
});
