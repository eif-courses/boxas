DROP INDEX IF EXISTS `commission_members_token_unique`;--> statement-breakpoint
ALTER TABLE `commission_members` ADD `access_code` text NOT NULL;--> statement-breakpoint
ALTER TABLE `commission_members` ADD `expires_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `commission_members` ADD `last_accessed_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `commission_members_access_code_unique` ON `commission_members` (`access_code`);--> statement-breakpoint
ALTER TABLE `commission_members` DROP COLUMN `token`;