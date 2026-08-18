import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildMediaCopyCandidates, sourceKeyFromPublicUrl } from "./mediaCopier";

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

function archiveWithSourceMedia() {
  const files: Record<string, Uint8Array> = {};
  for (const [table, header] of Object.entries(headers)) files[`${table}_20260818_184800.csv`] = strToU8(`${header}\n`);
  files["tracks_20260818_184800.csv"] = strToU8(`${headers.tracks}\n1,1,Track,Description,https://faderlabs-client-uploads.s3.us-east-2.amazonaws.com/tracks/audio.wav,tracks/audio.wav,0,0,2026-01-01,2026-01-01\n`);
  files["deliverables_20260818_184800.csv"] = strToU8(`${headers.deliverables}\n1,1,Video,,,https://faderlabs-client-uploads.s3.us-east-2.amazonaws.com/deliverables/source.mp4,video,0,2026-01-01,2026-01-01,,,,,https://faderlabs-client-uploads.s3.us-east-2.amazonaws.com/proxies/source.mp4,,ready\n`);
  return zipSync(files);
}

describe("isolated media copier manifest", () => {
  it("accepts only the explicitly approved public source bucket", () => {
    expect(sourceKeyFromPublicUrl("https://faderlabs-client-uploads.s3.us-east-2.amazonaws.com/tracks/audio.wav")).toBe("tracks/audio.wav");
    expect(sourceKeyFromPublicUrl("https://example.com/tracks/audio.wav")).toBeUndefined();
  });

  it("creates deterministic private targets for approved track, deliverable, and proxy media", () => {
    const candidates = buildMediaCopyCandidates(archiveWithSourceMedia());
    expect(candidates).toHaveLength(3);
    expect(candidates.map((candidate) => candidate.targetKey)).toEqual([
      "legacy-source/tracks/audio.wav",
      "legacy-source/deliverables/source.mp4",
      "legacy-source/proxies/source.mp4",
    ]);
  });
});
