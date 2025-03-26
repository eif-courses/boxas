CREATE TABLE `commission_members` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`department` text NOT NULL,
	`job_title` text DEFAULT 'Komisijos narys' NOT NULL,
	`is_active` integer DEFAULT 1,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `commission_email_idx` ON `commission_members` (`email`);--> statement-breakpoint
CREATE INDEX `commission_dept_idx` ON `commission_members` (`department`);--> statement-breakpoint
CREATE INDEX `commission_active_email_idx` ON `commission_members` (`is_active`,`email`);--> statement-breakpoint
ALTER TABLE `student_records` ADD `final_project_title_en` text DEFAULT '' NOT NULL;