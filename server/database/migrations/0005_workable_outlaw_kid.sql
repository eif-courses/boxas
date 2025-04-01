DROP INDEX IF EXISTS `commission_email_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `commission_dept_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `commission_active_email_idx`;--> statement-breakpoint
ALTER TABLE `commission_members` ADD `token` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `commission_members_token_unique` ON `commission_members` (`token`);--> statement-breakpoint
ALTER TABLE `commission_members` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `commission_members` DROP COLUMN `job_title`;