CREATE TABLE `client_project_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`submitterName` varchar(200) NOT NULL,
	`submitterEmail` varchar(320) NOT NULL,
	`submitterCompany` varchar(200),
	`files` text NOT NULL DEFAULT ('[]'),
	`status` enum('new','in_review','completed') NOT NULL DEFAULT 'new',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_project_requests_id` PRIMARY KEY(`id`)
);
