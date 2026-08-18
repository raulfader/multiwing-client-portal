import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { MULTIWING_IMPORT_TABLES, parseApprovedImportArchive } from "./dataImporter";

const headers = {
  users: "id,openId,name,email,loginMethod,role,createdAt,updatedAt,lastSignedIn",
  pillars: "id,title,description,sortOrder,createdAt,updatedAt",
  tracks: "id,pillarId,title,description,audioUrl,audioKey,durationSeconds,sortOrder,createdAt,updatedAt",
  projects: "id,title,slug,description,coverImageUrl,category,sortOrder,isPublished,createdAt,updatedAt,projectStatus",
  deliverables: "id,projectId,title,description,thumbnailUrl,downloadUrl,fileType,sortOrder,createdAt,updatedAt,fileKey,fileName,fileSize,reviewStatus,proxyUrl,proxyKey,proxyStatus",
  comments: "id,trackId,userId,content,timestampSeconds,createdAt,commenterName,adminResponse,resolvedAt",
  approvals: "id,pillarId,userId,status,note,updatedAt,createdAt",
  track_approvals: "id,trackId,userId,status,updatedAt,createdAt",
  deliverable_comments: "id,deliverableId,userId,content,createdAt,commenterName,adminResponse,resolvedAt,timestampSeconds",
  project_contacts: "id,projectId,firstName,lastName,email,createdAt",
  client_project_requests: "id,title,description,submitterName,submitterEmail,submitterCompany,files,status,adminNotes,createdAt,updatedAt",
  site_settings: "id,key,value,updatedAt",
  activity_log: "id,eventType,subject,detail,createdAt,deliverableId",
} as const;

function approvedArchive(extra: Record<string, Uint8Array> = {}) {
  const files: Record<string, Uint8Array> = {};
  for (const table of MULTIWING_IMPORT_TABLES) {
    files[`${table}_20260818_184800.csv`] = strToU8(`${headers[table]}\n`);
  }
  return zipSync({ ...files, ...extra });
}

describe("parseApprovedImportArchive", () => {
  it("accepts every approved source table with matching CSV headers", () => {
    const rows = parseApprovedImportArchive(approvedArchive());
    expect(Object.keys(rows)).toHaveLength(MULTIWING_IMPORT_TABLES.length);
    expect(rows.projects).toEqual([]);
  });

  it("rejects unapproved files before staging data can be changed", () => {
    expect(() => parseApprovedImportArchive(approvedArchive({ "custom_sessions_20260818_184800.csv": strToU8("id,token\n") }))).toThrow("unapproved file");
  });

  it("preserves quoted commas and quotes in an approved CSV field", () => {
    const archive = approvedArchive({
      "projects_20260818_184800.csv": strToU8(`${headers.projects}\n1,"A, \"\"quoted\"\" project",slug,,,,0,1,2026-01-01,2026-01-01,started\n`),
    });
    const rows = parseApprovedImportArchive(archive);
    expect(rows.projects[0].title).toBe('A, "quoted" project');
  });
});
