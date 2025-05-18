DROP INDEX IF EXISTS `department_heads_department_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `department_heads_is_active_idx`;--> statement-breakpoint
ALTER TABLE `department_heads` ADD `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `department_heads` ADD `surname` text NOT NULL;--> statement-breakpoint
ALTER TABLE `department_heads` ADD `departmentEn` text NOT NULL;