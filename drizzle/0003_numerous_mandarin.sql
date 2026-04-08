CREATE TABLE `track_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('approved','needs_changes','rejected','pending') NOT NULL DEFAULT 'pending',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `track_approvals_id` PRIMARY KEY(`id`)
);
