import fs from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  detectFileType,
  downloadUrlToFile,
  guessContentType,
  normalizeContentType,
  putFileToPresignedUrl,
  resolveDownloadDir,
  resolveDownloadTarget,
  resolveReadableFile,
  slugify,
} from "../src/files";
import { parseSince } from "../src/util";
import { testConfig } from "./helpers";

let tmp: string;
let server: http.Server;
let baseUrl: string;
const received: Array<{ method?: string; headers: http.IncomingHttpHeaders; body: Buffer }> = [];

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mw-mcp-files-"));
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      received.push({ method: req.method, headers: req.headers, body: Buffer.concat(chunks) });
      if (req.url === "/denied") {
        res.writeHead(403).end("<Error><Code>AccessDenied</Code><Message>Request has expired</Message></Error>");
      } else if (req.url === "/file") {
        res.writeHead(200, { "Content-Type": "video/mp4" }).end(Buffer.alloc(4096, 7));
      } else {
        res.writeHead(200).end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.close();
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("content types", () => {
  it("mirrors the admin UI's detection and WAV normalisation", () => {
    expect(guessContentType("Final Cut.MOV")).toBe("video/quicktime");
    expect(normalizeContentType("audio/x-wav")).toBe("audio/wav");
    expect(detectFileType("video/quicktime")).toBe("video");
    expect(detectFileType("application/zip")).toBe("archive");
    expect(detectFileType("application/pdf")).toBe("document");
  });
});

describe("presigned transfers", () => {
  it("PUTs the file with explicit Content-Type and Content-Length", async () => {
    const file = path.join(tmp, "clip.mp4");
    await fs.writeFile(file, Buffer.alloc(1234, 1));
    await putFileToPresignedUrl(`${baseUrl}/upload?X-Amz-Signature=abc`, file, "video/mp4", 1234);
    const req = received.at(-1)!;
    expect(req.method).toBe("PUT");
    expect(req.headers["content-type"]).toBe("video/mp4");
    expect(req.headers["content-length"]).toBe("1234");
    expect(req.body.length).toBe(1234);
  });

  it("reports S3 error messages", async () => {
    const file = path.join(tmp, "clip2.mp4");
    await fs.writeFile(file, "x");
    await expect(putFileToPresignedUrl(`${baseUrl}/denied`, file, "video/mp4", 1)).rejects.toThrow("Upload failed (403): Request has expired");
  });

  it("streams downloads to disk without leaving partial files", async () => {
    const target = path.join(tmp, "out.mp4");
    await expect(downloadUrlToFile(`${baseUrl}/file`, target)).resolves.toBe(4096);
    await expect(downloadUrlToFile(`${baseUrl}/denied`, path.join(tmp, "bad.mp4"))).rejects.toThrow("Download failed (403");
    const entries = await fs.readdir(tmp);
    expect(entries.some((e) => e.endsWith(".part"))).toBe(false);
  });
});

describe("local paths", () => {
  it("resolves download targets for directories, files and the default dir", async () => {
    const config = testConfig({ downloadDir: path.join(tmp, "dl") });
    expect(await resolveDownloadTarget(undefined, "a/b:c.mov", config)).toBe(path.join(tmp, "dl", "a_b_c.mov"));
    expect(await resolveDownloadTarget(tmp, "x.mov", config)).toBe(path.join(tmp, "x.mov"));
    expect(await resolveDownloadTarget(path.join(tmp, "new") + path.sep, "x.mov", config)).toBe(path.join(tmp, "new", "x.mov"));
    expect(await resolveDownloadTarget(path.join(tmp, "named.mov"), "x.mov", config)).toBe(path.join(tmp, "named.mov"));
  });

  it("never overwrites existing files and never lets portal names escape the folder", async () => {
    const dir = path.join(tmp, "nooverwrite");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "cut.mov"), "existing");
    await fs.writeFile(path.join(dir, "cut (1).mov"), "existing");
    const config = testConfig();
    expect(await resolveDownloadTarget(dir, "cut.mov", config)).toBe(path.join(dir, "cut (2).mov"));
    expect(await resolveDownloadTarget(dir, "..", config)).toBe(path.join(dir, "file"));
    expect(await resolveDownloadTarget(dir, "../../.bashrc", config)).toBe(path.join(dir, ".._.._.bashrc"));
  });

  it("enforces MULTIWING_FILE_ROOTS for reads and writes, including through symlinks", async () => {
    const allowed = path.join(tmp, "allowed");
    await fs.mkdir(allowed, { recursive: true });
    await fs.writeFile(path.join(allowed, "ok.txt"), "ok");
    await fs.writeFile(path.join(tmp, "secret.txt"), "no");
    await fs.symlink(path.join(tmp, "secret.txt"), path.join(allowed, "link.txt"));
    await fs.symlink(tmp, path.join(allowed, "escape"));
    const config = testConfig({ fileRoots: [allowed] });
    await expect(resolveReadableFile(path.join(allowed, "ok.txt"), config)).resolves.toMatchObject({ size: 2 });
    await expect(resolveReadableFile(path.join(allowed, "..", "secret.txt"), config)).rejects.toThrow("outside the allowed folders");
    await expect(resolveReadableFile(path.join(allowed, "link.txt"), config)).rejects.toThrow("outside the allowed folders");
    await expect(resolveDownloadTarget(path.join(tmp, "elsewhere.mov"), "x", config)).rejects.toThrow("outside the allowed folders");
    await expect(resolveDownloadTarget(path.join(allowed, "escape", "x.mov"), "x", config)).rejects.toThrow("outside the allowed folders");
    await expect(resolveDownloadDir(path.join(tmp, "not-created"), config)).rejects.toThrow("outside the allowed folders");
    await expect(fs.stat(path.join(tmp, "not-created"))).rejects.toThrow();
  });

  it("refuses to upload credential files even inside allowed folders", async () => {
    const home = path.join(tmp, "home");
    for (const rel of [".ssh/id_ed25519", ".aws/credentials", "project/.env", "project/.env.local", "project/server.pem"]) {
      await fs.mkdir(path.dirname(path.join(home, rel)), { recursive: true });
      await fs.writeFile(path.join(home, rel), "secret");
    }
    await fs.writeFile(path.join(home, "project", "deck.key"), "keynote");
    const config = testConfig({ fileRoots: [home] });
    for (const rel of [".ssh/id_ed25519", ".aws/credentials", "project/.env", "project/.env.local", "project/server.pem"]) {
      await expect(resolveReadableFile(path.join(home, rel), config), rel).rejects.toThrow("credential or secret");
    }
    await expect(resolveReadableFile(path.join(home, "project", "deck.key"), config)).resolves.toMatchObject({ name: "deck.key" });
  });
});

describe("helpers", () => {
  it("parses relative and absolute since values", () => {
    const now = Date.parse("2026-09-25T12:00:00Z");
    expect(parseSince("24h", now)?.toISOString()).toBe("2026-09-24T12:00:00.000Z");
    expect(parseSince("2w", now)?.toISOString()).toBe("2026-09-11T12:00:00.000Z");
    expect(parseSince("2026-09-01T00:00:00Z")?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(() => parseSince("yesterday")).toThrow();
  });

  it("slugifies titles like the portal's URL slugs", () => {
    expect(slugify("ACREX '26 — Launch Film")).toBe("acrex-26-launch-film");
  });
});
