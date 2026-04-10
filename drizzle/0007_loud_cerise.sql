CREATE TABLE `email_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailLogId` int NOT NULL,
	`eventType` enum('open','click') NOT NULL,
	`url` text,
	`userAgent` text,
	`ip` varchar(64),
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_log` ADD `trackingToken` varchar(128);--> statement-breakpoint
ALTER TABLE `email_log` ADD `openCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `email_log` ADD `clickCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `email_log` ADD `firstOpenedAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_log` ADD `lastOpenedAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_log` ADD `firstClickedAt` timestamp;