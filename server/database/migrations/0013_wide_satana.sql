ALTER TABLE `department_heads` ADD `sure_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `department_heads` ADD `department_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `department_heads` ADD `role` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `department_heads_role_idx` ON `department_heads` (`role`);--> statement-breakpoint
ALTER TABLE `department_heads` DROP COLUMN `surname`;--> statement-breakpoint
ALTER TABLE `department_heads` DROP COLUMN `departmentEn`;