PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_department_heads` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`surname` text DEFAULT '' NOT NULL,
	`department` text DEFAULT '' NOT NULL,
	`departmentEn` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
INSERT INTO `__new_department_heads`("id", "email", "name", "surname", "department", "departmentEn", "job_title", "is_active", "created_at") SELECT "id", "email", "name", "surname", "department", "departmentEn", "job_title", "is_active", "created_at" FROM `department_heads`;--> statement-breakpoint
DROP TABLE `department_heads`;--> statement-breakpoint
ALTER TABLE `__new_department_heads` RENAME TO `department_heads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `department_heads_email_unique` ON `department_heads` (`email`);--> statement-breakpoint
CREATE INDEX `department_heads_email_idx` ON `department_heads` (`email`);