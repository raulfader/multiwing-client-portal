import mysql from 'mysql2/promise';

const sqls = [
  "ALTER TABLE `email_log` ADD `trackingToken` varchar(128)",
  "ALTER TABLE `email_log` ADD `openCount` int NOT NULL DEFAULT 0",
  "ALTER TABLE `email_log` ADD `clickCount` int NOT NULL DEFAULT 0",
  "ALTER TABLE `email_log` ADD `firstOpenedAt` timestamp NULL",
  "ALTER TABLE `email_log` ADD `lastOpenedAt` timestamp NULL",
  "ALTER TABLE `email_log` ADD `firstClickedAt` timestamp NULL",
  `CREATE TABLE IF NOT EXISTS \`email_events\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`emailLogId\` int NOT NULL,
    \`eventType\` enum('open','click') NOT NULL,
    \`url\` text,
    \`userAgent\` text,
    \`ip\` varchar(64),
    \`occurredAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`email_events_id\` PRIMARY KEY(\`id\`)
  )`
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);
for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.substring(0, 80));
  } catch(e) {
    console.log('SKIP:', e.message.substring(0, 100));
  }
}
await conn.end();
console.log('Migration complete');
