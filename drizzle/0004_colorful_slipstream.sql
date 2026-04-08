CREATE TABLE `email_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`contactId` int NOT NULL,
	`subject` varchar(500) NOT NULL,
	`status` enum('sent','failed') NOT NULL DEFAULT 'sent',
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100),
	`email` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_contacts_id` PRIMARY KEY(`id`)
);
