import mysql from "mysql2/promise";
import { hydrateRuntimeConfig } from "./runtimeConfig";

export type SchemaConnection = {
  execute: (statement: string) => Promise<unknown>;
  end: () => Promise<void>;
};

/**
 * Final portal tables expressed as safe, repeatable CREATE TABLE statements.
 * This initializer creates structure only; it contains no source content,
 * client records, authentication credentials, media references, or seed data.
 */
export const MULTIWING_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`openId\` VARCHAR(64) NOT NULL,
    \`name\` TEXT,
    \`email\` VARCHAR(320),
    \`loginMethod\` VARCHAR(64),
    \`role\` ENUM('user','admin') NOT NULL DEFAULT 'user',
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`lastSignedIn\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`users_openId_unique\` (\`openId\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`pillars\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`title\` VARCHAR(255) NOT NULL,
    \`description\` TEXT,
    \`sortOrder\` INT NOT NULL DEFAULT 0,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`tracks\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`pillarId\` INT NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`description\` TEXT,
    \`audioUrl\` TEXT NOT NULL,
    \`audioKey\` VARCHAR(512) NOT NULL,
    \`durationSeconds\` INT,
    \`sortOrder\` INT NOT NULL DEFAULT 0,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`comments\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`trackId\` INT NOT NULL,
    \`userId\` INT NOT NULL,
    \`commenterName\` VARCHAR(100),
    \`content\` TEXT NOT NULL,
    \`timestampSeconds\` INT,
    \`adminResponse\` TEXT,
    \`resolvedAt\` TIMESTAMP NULL,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`approvals\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`pillarId\` INT NOT NULL,
    \`userId\` INT NOT NULL,
    \`status\` ENUM('approved','rejected','pending') NOT NULL DEFAULT 'pending',
    \`note\` TEXT,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`track_approvals\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`trackId\` INT NOT NULL,
    \`userId\` INT NOT NULL,
    \`status\` ENUM('approved','needs_changes','rejected','pending') NOT NULL DEFAULT 'pending',
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`projects\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`title\` VARCHAR(255) NOT NULL,
    \`slug\` VARCHAR(255) NOT NULL,
    \`description\` TEXT,
    \`coverImageUrl\` TEXT,
    \`category\` VARCHAR(100),
    \`sortOrder\` INT NOT NULL DEFAULT 0,
    \`isPublished\` INT NOT NULL DEFAULT 1,
    \`projectStatus\` VARCHAR(50) NOT NULL DEFAULT 'started',
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`projects_slug_unique\` (\`slug\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`deliverables\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`projectId\` INT NOT NULL,
    \`title\` VARCHAR(255) NOT NULL,
    \`description\` TEXT,
    \`thumbnailUrl\` TEXT,
    \`downloadUrl\` TEXT,
    \`fileType\` VARCHAR(50) DEFAULT 'video',
    \`fileKey\` TEXT,
    \`fileName\` VARCHAR(500),
    \`fileSize\` BIGINT,
    \`sortOrder\` INT NOT NULL DEFAULT 0,
    \`reviewStatus\` VARCHAR(50) NOT NULL DEFAULT 'pending',
    \`proxyUrl\` TEXT,
    \`proxyKey\` TEXT,
    \`proxyStatus\` VARCHAR(20) DEFAULT 'none',
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`deliverable_comments\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`deliverableId\` INT NOT NULL,
    \`userId\` INT NOT NULL,
    \`commenterName\` VARCHAR(100),
    \`content\` TEXT NOT NULL,
    \`timestampSeconds\` INT,
    \`adminResponse\` TEXT,
    \`resolvedAt\` TIMESTAMP NULL,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`project_contacts\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`projectId\` INT NOT NULL,
    \`firstName\` VARCHAR(100) NOT NULL,
    \`lastName\` VARCHAR(100),
    \`email\` VARCHAR(320) NOT NULL,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`email_log\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`projectId\` INT NOT NULL,
    \`contactId\` INT NOT NULL,
    \`subject\` VARCHAR(500) NOT NULL,
    \`status\` ENUM('sent','failed') NOT NULL DEFAULT 'sent',
    \`errorMessage\` TEXT,
    \`trackingToken\` VARCHAR(128),
    \`openCount\` INT NOT NULL DEFAULT 0,
    \`clickCount\` INT NOT NULL DEFAULT 0,
    \`firstOpenedAt\` TIMESTAMP NULL,
    \`lastOpenedAt\` TIMESTAMP NULL,
    \`firstClickedAt\` TIMESTAMP NULL,
    \`sentAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`email_events\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`emailLogId\` INT NOT NULL,
    \`eventType\` ENUM('open','click') NOT NULL,
    \`url\` TEXT,
    \`userAgent\` TEXT,
    \`ip\` VARCHAR(64),
    \`occurredAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`client_project_requests\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`title\` VARCHAR(255) NOT NULL,
    \`description\` TEXT,
    \`submitterName\` VARCHAR(200) NOT NULL,
    \`submitterEmail\` VARCHAR(320) NOT NULL,
    \`submitterCompany\` VARCHAR(200),
    \`files\` TEXT NOT NULL DEFAULT ('[]'),
    \`status\` ENUM('new','in_review','completed') NOT NULL DEFAULT 'new',
    \`adminNotes\` TEXT,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`project_shares\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`projectId\` INT NOT NULL,
    \`grantedByUserId\` INT,
    \`email\` VARCHAR(320) NOT NULL,
    \`accessLevel\` ENUM('read','download') NOT NULL DEFAULT 'read',
    \`token\` VARCHAR(128) NOT NULL,
    \`isRevoked\` INT NOT NULL DEFAULT 0,
    \`expiresAt\` TIMESTAMP NULL,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`project_shares_token_unique\` (\`token\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`share_otps\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`shareId\` INT NOT NULL,
    \`code\` VARCHAR(8) NOT NULL,
    \`expiresAt\` TIMESTAMP NOT NULL,
    \`usedAt\` TIMESTAMP NULL,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`share_sessions\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`shareId\` INT NOT NULL,
    \`sessionToken\` VARCHAR(128) NOT NULL,
    \`expiresAt\` TIMESTAMP NOT NULL,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`share_sessions_sessionToken_unique\` (\`sessionToken\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`site_settings\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`key\` VARCHAR(100) NOT NULL,
    \`value\` TEXT,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`site_settings_key_unique\` (\`key\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`custom_sessions\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`token\` VARCHAR(128) NOT NULL,
    \`role\` ENUM('client','admin') NOT NULL DEFAULT 'client',
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`expiresAt\` TIMESTAMP NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`custom_sessions_token_unique\` (\`token\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`activity_log\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`eventType\` ENUM('comment','download') NOT NULL,
    \`subject\` VARCHAR(500) NOT NULL,
    \`detail\` TEXT,
    \`deliverableId\` INT,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`,
] as const;

export async function applyMultiwingSchema(connection: SchemaConnection): Promise<number> {
  for (const statement of MULTIWING_SCHEMA_STATEMENTS) {
    await connection.execute(statement);
  }
  return MULTIWING_SCHEMA_STATEMENTS.length;
}

function requiredDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is unavailable after runtime configuration hydration");
  }
  return databaseUrl;
}

/** Invoked only by the explicit staging deployment workflow from inside the VPC. */
export async function handlerForSchemaMigration() {
  let connection: SchemaConnection | undefined;
  try {
    await hydrateRuntimeConfig();
    connection = await mysql.createConnection(requiredDatabaseUrl());
    const appliedStatements = await applyMultiwingSchema(connection);
    console.info("[Multiwing schema] initialized", { appliedStatements });
    return { ok: true, appliedStatements };
  } finally {
    await connection?.end();
  }
}
