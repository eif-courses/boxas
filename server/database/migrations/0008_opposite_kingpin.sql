CREATE TABLE `assignment_comments` (
	`id` integer PRIMARY KEY NOT NULL,
	`assignment_id` integer,
	`version_id` integer,
	`parent_id` integer,
	`field_name` text,
	`text` text NOT NULL,
	`role` text NOT NULL,
	`author_name` text NOT NULL,
	`created_date` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `project_assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `project_assignment_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assignment_comments_assignment_id_idx` ON `assignment_comments` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `assignment_comments_version_id_idx` ON `assignment_comments` (`version_id`);--> statement-breakpoint
CREATE INDEX `assignment_comments_parent_id_idx` ON `assignment_comments` (`parent_id`);--> statement-breakpoint
CREATE TABLE `project_assignment_versions` (
	`id` integer PRIMARY KEY NOT NULL,
	`assignment_id` integer,
	`created_by` text NOT NULL,
	`comment` text NOT NULL,
	`version_data` text NOT NULL,
	`created_date` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `project_assignments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_assignment_versions_assignment_id_idx` ON `project_assignment_versions` (`assignment_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_project_assignments` (
	`id` integer PRIMARY KEY NOT NULL,
	`student_record_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_signed` integer DEFAULT 0 NOT NULL,
	`created_date` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`last_updated` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`student_record_id`) REFERENCES `student_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_project_assignments`("id", "student_record_id", "status", "is_signed", "created_date", "last_updated") SELECT "id", "student_record_id", "status", "is_signed", "created_date", "last_updated" FROM `project_assignments`;--> statement-breakpoint
DROP TABLE `project_assignments`;--> statement-breakpoint
ALTER TABLE `__new_project_assignments` RENAME TO `project_assignments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `project_assignments_student_record_idx` ON `project_assignments` (`student_record_id`);