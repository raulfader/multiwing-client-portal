import { readFileSync, writeFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";

const [archivePath, outputPath] = process.argv.slice(2);
if (!archivePath || !outputPath) throw new Error("Usage: node scripts/build-isolated-media-manifest.mjs archive.zip manifest.json");

const SOURCE_HOST = "faderlabs-client-uploads.s3.us-east-2.amazonaws.com";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(value); value = ""; }
    else if (character === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += character;
  }
  if (quoted) throw new Error("Unterminated quoted CSV field");
  if (value.length || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function rowsFromCsv(bytes) {
  const [header, ...records] = parseCsv(strFromU8(bytes));
  return records.filter((record) => record.some(Boolean)).map((record) => Object.fromEntries(header.map((key, index) => [key, record[index] ?? ""])));
}

function sourceKey(value) {
  if (!value) return undefined;
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.host !== SOURCE_HOST) return undefined;
  const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!key || key.includes("..")) throw new Error("Invalid source key");
  return key;
}

const files = unzipSync(readFileSync(archivePath));
const candidates = new Map();
function add(value) {
  const key = sourceKey(value);
  if (key) candidates.set(key, { sourceKey: key, targetKey: `legacy-source/${key}` });
}
for (const row of rowsFromCsv(files[Object.keys(files).find((name) => /^tracks_\d{8}_\d{6}\.csv$/.test(name))])) add(row.audioUrl);
for (const row of rowsFromCsv(files[Object.keys(files).find((name) => /^deliverables_\d{8}_\d{6}\.csv$/.test(name))])) { add(row.downloadUrl); add(row.proxyUrl); }
writeFileSync(outputPath, JSON.stringify([...candidates.values()], null, 2));
