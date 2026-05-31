ALTER TABLE `deliverables` ADD `proxyUrl` text;--> statement-breakpoint
ALTER TABLE `deliverables` ADD `proxyKey` text;--> statement-breakpoint
ALTER TABLE `deliverables` ADD `proxyStatus` varchar(20) DEFAULT 'none';