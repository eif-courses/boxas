CREATE TABLE `project_assignments` (
	`id` integer PRIMARY KEY NOT NULL,
	`student_record_id` integer,
	`title` text DEFAULT '' NOT NULL,
	`title_en` text DEFAULT '' NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`tasks` text DEFAULT '' NOT NULL,
	`implementation_tools` text DEFAULT '' NOT NULL,
	`supervisor` text DEFAULT '' NOT NULL,
	`department_head` text DEFAULT 'Justinas Zailskas' NOT NULL,
	`adviser_technical_1` text DEFAULT '',
	`adviser_technical_2` text DEFAULT '',
	`adviser_english` text DEFAULT '' NOT NULL,
	`defense_date` text DEFAULT '',
	`assignment_date` integer DEFAULT (strftime('%s', 'now')),
	`is_signed` integer DEFAULT 0 NOT NULL,
	`created_date` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`student_record_id`) REFERENCES `student_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_assignments_student_record_idx` ON `project_assignments` (`student_record_id`);