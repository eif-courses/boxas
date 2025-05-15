CREATE TABLE `project_topic_registration_versions` (
	`id` integer PRIMARY KEY NOT NULL,
	`topic_registration_id` integer NOT NULL,
	`version_data` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`topic_registration_id`) REFERENCES `project_topic_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_topic_registrations` (
	`id` integer PRIMARY KEY NOT NULL,
	`student_record_id` integer NOT NULL,
	`title` text NOT NULL,
	`title_en` text NOT NULL,
	`problem` text NOT NULL,
	`objective` text NOT NULL,
	`tasks` text NOT NULL,
	`completion_date` text,
	`supervisor` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`submitted_at` integer,
	`current_version` integer DEFAULT 1,
	FOREIGN KEY (`student_record_id`) REFERENCES `student_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `topic_registration_comments` (
	`id` integer PRIMARY KEY NOT NULL,
	`topic_registration_id` integer NOT NULL,
	`field_name` text,
	`comment_text` text NOT NULL,
	`author_role` text NOT NULL,
	`author_name` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`parent_comment_id` integer,
	FOREIGN KEY (`topic_registration_id`) REFERENCES `project_topic_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `assignment_comments`;--> statement-breakpoint
DROP TABLE `project_assignment_versions`;--> statement-breakpoint
DROP TABLE `project_assignments`;