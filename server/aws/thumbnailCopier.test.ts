import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildThumbnailCandidates, privateThumbnailKey } from "./thumbnailCopier";

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

function archiveWithThumbnail() {
  const files: Record<string, Uint8Array> = {};
  for (const [table, header] of Object.entries(headers)) files[`${table}_20260818_200000.csv`] = strToU8(`${header}\n`);
  files["deliverables_20260818_200000.csv"] = strToU8(`${headers.deliverables}\n1,1,Asset,,https://d2xsxph8kpxj0f.cloudfront.net/a/b/thumb.jpg,,image,0,2026-01-01,2026-01-01,,,,,,,\n`);
  return zipSync(files);
}

describe("isolated thumbnail copier", () => {
  it("accepts only thumbnails on the approved public CloudFront host", () => {
    expect(privateThumbnailKey("https://d2xsxph8kpxj0f.cloudfront.net/a/b/thumb.jpg")).toMatch(/^legacy-external\/cloudfront\/[a-f0-9]{64}\.jpg$/);
    expect(() => privateThumbnailKey("https://example.com/thumb.jpg")).toThrow();
  });
  it("derives one deterministic private target from an approved archive thumbnail", () => {
    expect(buildThumbnailCandidates(archiveWithThumbnail())).toHaveLength(1);
  });
});
