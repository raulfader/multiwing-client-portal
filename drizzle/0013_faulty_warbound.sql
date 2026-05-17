CREATE TABLE `project_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`grantedByUserId` int,
	`email` varchar(320) NOT NULL,
	`accessLevel` enum('read','download') NOT NULL DEFAULT 'read',
	`token` varchar(128) NOT NULL,
	`isRevoked` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_shares_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `share_otps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareId` int NOT NULL,
	`code` varchar(8) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `share_otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `share_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareId` int NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `share_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `share_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
