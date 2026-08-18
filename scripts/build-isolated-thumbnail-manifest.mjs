import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";

const [archivePath, outputPath] = process.argv.slice(2);
if (!archivePath || !outputPath) throw new Error("Usage: node scripts/build-isolated-thumbnail-manifest.mjs archive.zip manifest.json");
const HOST = "d2xsxph8kpxj0f.cloudfront.net";

function parseCsv(text) {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) { if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; } else if (char === '"') quoted = false; else value += char; }
    else if (char === '"') quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (quoted) throw new Error("Unterminated quoted CSV field");
  if (value.length || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

const files = unzipSync(readFileSync(archivePath));
const fileName = Object.keys(files).find((name) => /^deliverables_\d{8}_\d{6}\.csv$/.test(name));
if (!fileName) throw new Error("Approved deliverables CSV was not found");
const [header, ...records] = parseCsv(strFromU8(files[fileName]));
const index = header.indexOf("thumbnailUrl");
const candidates = new Map();
for (const record of records) {
  const value = record[index] ?? "";
  if (!value.startsWith("https://")) continue;
  const parsed = new URL(value);
  if (parsed.host !== HOST) continue;
  const extension = parsed.pathname.match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "bin";
  const targetKey = `legacy-external/cloudfront/${crypto.createHash("sha256").update(value).digest("hex")}.${extension}`;
  candidates.set(value, { sourceUrl: value, targetKey });
}
writeFileSync(outputPath, JSON.stringify([...candidates.values()], null, 2));
