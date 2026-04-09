import mysql from 'mysql2/promise';

const sqls = [
  "ALTER TABLE `comments` ADD `commenterName` varchar(100)",
  "ALTER TABLE `comments` ADD `adminResponse` text",
  "ALTER TABLE `comments` ADD `resolvedAt` timestamp NULL",
  "ALTER TABLE `deliverable_comments` ADD `commenterName` varchar(100)",
  "ALTER TABLE `deliverable_comments` ADD `adminResponse` text",
  "ALTER TABLE `deliverable_comments` ADD `resolvedAt` timestamp NULL"
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);
for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.substring(0, 70));
  } catch(e) {
    console.log('SKIP:', e.message.substring(0, 80));
  }
}
await conn.end();
console.log('Migration complete');
