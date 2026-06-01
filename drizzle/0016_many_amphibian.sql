CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('comment','download') NOT NULL,
	`subject` varchar(500) NOT NULL,
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
