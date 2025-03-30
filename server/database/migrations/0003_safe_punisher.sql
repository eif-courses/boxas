ALTER TABLE `reviewer_reports` ADD `reviewer_personal_details` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_goals` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_theory` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_practical` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_theory_practical_link` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_results` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_practical_significance` text;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_language` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_pros` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_cons` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` ADD `review_questions` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviewer_reports` DROP COLUMN `reviewer_personal_info`;--> statement-breakpoint
ALTER TABLE `reviewer_reports` DROP COLUMN `review_fields`;