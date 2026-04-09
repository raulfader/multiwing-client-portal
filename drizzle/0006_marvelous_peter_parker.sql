ALTER TABLE `comments` ADD `commenterName` varchar(100);--> statement-breakpoint
ALTER TABLE `comments` ADD `adminResponse` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `resolvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `deliverable_comments` ADD `commenterName` varchar(100);--> statement-breakpoint
ALTER TABLE `deliverable_comments` ADD `adminResponse` text;--> statement-breakpoint
ALTER TABLE `deliverable_comments` ADD `resolvedAt` timestamp;