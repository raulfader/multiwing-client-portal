CREATE TABLE `approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pillarId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('approved','rejected','pending') NOT NULL DEFAULT 'pending',
	`note` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`timestampSeconds` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pillars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pillars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pillarId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`audioUrl` text NOT NULL,
	`audioKey` varchar(512) NOT NULL,
	`durationSeconds` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`)
);
