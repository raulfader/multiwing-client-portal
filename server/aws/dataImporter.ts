import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { strFromU8, unzipSync } from "fflate";
import mysql from "mysql2/promise";
import { hydrateRuntimeConfig } from "./runtimeConfig";

const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";

export const MULTIWING_IMPORT_TABLES = [
  "users",
  "pillars",
  "tracks",
  "projects",
  "deliverables",
  "comments",
  "approvals",
  "track_approvals",
  "deliverable_comments",
  "project_contacts",
  "client_project_requests",
  "site_settings",
  "activity_log",
] as const;

type ImportTable = (typeof MULTIWING_IMPORT_TABLES)[number];
type CsvRow = Record<string, string | null>;
type ImportRows = Record<ImportTable, CsvRow[]>;

const EXPECTED_COLUMNS: Record<ImportTable, readonly string[]> = {
  users: ["id", "openId", "name", "email", "loginMethod", "role", "createdAt", "updatedAt", "lastSignedIn"],
  pillars: ["id", "title", "description", "sortOrder", "createdAt", "updatedAt"],
  tracks: ["id", "pillarId", "title", "description", "audioUrl", "audioKey", "durationSeconds", "sortOrder", "createdAt", "updatedAt"],
  projects: ["id", "title", "slug", "description", "coverImageUrl", "category", "sortOrder", "isPublished", "createdAt", "updatedAt", "projectStatus"],
  deliverables: ["id", "projectId", "title", "description", "thumbnailUrl", "downloadUrl", "fileType", "sortOrder", "createdAt", "updatedAt", "fileKey", "fileName", "fileSize", "reviewStatus", "proxyUrl", "proxyKey", "proxyStatus"],
  comments: ["id", "trackId", "userId", "content", "timestampSeconds", "createdAt", "commenterName", "adminResponse", "resolvedAt"],
  approvals: ["id", "pillarId", "userId", "status", "note", "updatedAt", "createdAt"],
  track_approvals: ["id", "trackId", "userId", "status", "updatedAt", "createdAt"],
  deliverable_comments: ["id", "deliverableId", "userId", "content", "createdAt", "commenterName", "adminResponse", "resolvedAt", "timestampSeconds"],
  project_contacts: ["id", "projectId", "firstName", "lastName", "email", "createdAt"],
  client_project_requests: ["id", "title", "description", "submitterName", "submitterEmail", "submitterCompany", "files", "status", "adminNotes", "createdAt", "updatedAt"],
  site_settings: ["id", "key", "value", "updatedAt"],
  activity_log: ["id", "eventType", "subject", "detail", "createdAt", "deliverableId"],
};

export type ImportConnection = {
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  execute: (statement: string, values?: readonly unknown[]) => Promise<unknown>;
  query: (statement: string) => Promise<unknown>;
  end: () => Promise<void>;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function csvRowsForTable(table: ImportTable, csv: string): CsvRow[] {
  const parsed = parseCsv(csv);
  const [header = [], ...records] = parsed;
  const expected = EXPECTED_COLUMNS[table];
  if (header.length !== expected.length || header.some((column, index) => column !== expected[index])) {
    throw new Error(`CSV columns do not match the approved ${table} export`);
  }

  return records
    .filter((record) => record.some((cell) => cell.length > 0))
    .map((record) => {
      if (record.length !== expected.length) {
        throw new Error(`CSV row has an unexpected column count in ${table}`);
      }
      return Object.fromEntries(expected.map((column, index) => [column, record[index] === "" ? null : record[index]]));
    });
}

function tableFromArchiveName(name: string): ImportTable | undefined {
  return MULTIWING_IMPORT_TABLES.find((table) => new RegExp(`^${table}_[0-9]{8}_[0-9]{6}\\.csv$`).test(name));
}

/** Validates the approved package before any isolated database mutation occurs. */
export function parseApprovedImportArchive(archive: Uint8Array): ImportRows {
  const files = unzipSync(archive);
  const imported = {} as ImportRows;
  const seen = new Set<ImportTable>();

  for (const [name, bytes] of Object.entries(files)) {
    if (name.startsWith("__MACOSX/") || name.endsWith("/")) continue;
    const table = tableFromArchiveName(name);
    if (!table) throw new Error(`Archive contains an unapproved file: ${name}`);
    if (seen.has(table)) throw new Error(`Archive contains more than one ${table} export`);
    imported[table] = csvRowsForTable(table, strFromU8(bytes));
    seen.add(table);
  }

  for (const table of MULTIWING_IMPORT_TABLES) {
    if (!seen.has(table)) throw new Error(`Archive is missing the required ${table} export`);
  }
  return imported;
}

function quotedIdentifier(value: string): string {
  return `\`${value}\``;
}

/** Replaces only the isolated staging copy with the validated approved source package. */
export async function importApprovedRows(connection: ImportConnection, rows: ImportRows) {
  const importedCounts = {} as Record<ImportTable, number>;
  await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
  await connection.beginTransaction();
  try {
    for (const table of [...MULTIWING_IMPORT_TABLES].reverse()) {
      await connection.execute(`DELETE FROM ${quotedIdentifier(table)}`);
    }

    for (const table of MULTIWING_IMPORT_TABLES) {
      const columns = EXPECTED_COLUMNS[table];
      const placeholders = columns.map(() => "?").join(", ");
      const statement = `INSERT INTO ${quotedIdentifier(table)} (${columns.map(quotedIdentifier).join(", ")}) VALUES (${placeholders})`;
      for (const record of rows[table]) {
        await connection.execute(statement, columns.map((column) => record[column]));
      }
      const [result] = await connection.query(`SELECT COALESCE(MAX(\`id\`), 0) + 1 AS nextId FROM ${quotedIdentifier(table)}`) as [Array<{ nextId: number }>];
      await connection.execute(`ALTER TABLE ${quotedIdentifier(table)} AUTO_INCREMENT = ${Number(result[0].nextId)}`);
      importedCounts[table] = rows[table].length;
    }

    await connection.commit();
    return importedCounts;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function allowedArchiveKey(event: { archiveKey?: string } | undefined): string {
  const key = event?.archiveKey;
  if (!key || !/^source-exports\/multiwing-source-export-[0-9]{4}-[0-9]{2}-[0-9]{2}\.zip$/.test(key)) {
    throw new Error("archiveKey must reference an approved source-exports/multiwing-source-export-YYYY-MM-DD.zip object");
  }
  return key;
}

/** Invoked only from the explicit GitHub workflow after a human-approved S3 upload. */
export async function handlerForDataImport(event?: { archiveKey?: string }) {
  const archiveKey = allowedArchiveKey(event);
  await hydrateRuntimeConfig();
  const bucket = requiredEnvironment("MIGRATION_AUDIT_BUCKET");
  const databaseUrl = requiredEnvironment("DATABASE_URL");
  const object = await new S3Client({ region: AWS_REGION }).send(new GetObjectCommand({ Bucket: bucket, Key: archiveKey }));
  const body = object.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (!body?.transformToByteArray) throw new Error("Migration archive body is unavailable");

  const rows = parseApprovedImportArchive(await body.transformToByteArray());
  let connection: ImportConnection | undefined;
  try {
    const databaseConnection = await mysql.createConnection(databaseUrl);
    connection = databaseConnection as unknown as ImportConnection;
    const importedCounts = await importApprovedRows(connection, rows);
    console.info("[Multiwing import] isolated staging package imported", { importedCounts });
    return { ok: true, importedCounts };
  } finally {
    await connection?.end();
  }
}
