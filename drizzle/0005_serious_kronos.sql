CREATE TABLE `custom_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`role` enum('client','admin') NOT NULL DEFAULT 'client',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `custom_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_sessions_token_unique` UNIQUE(`token`)
);
