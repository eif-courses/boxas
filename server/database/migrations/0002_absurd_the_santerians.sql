ALTER TABLE `supervisor_reports` ADD `supervisor_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `supervisor_reports` ADD `supervisor_position` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `supervisor_reports` ADD `supervisor_workplace` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `supervisor_reports` ADD `is_signed` integer DEFAULT 0 NOT NULL;