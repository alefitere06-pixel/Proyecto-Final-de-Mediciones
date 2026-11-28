CREATE TABLE IF NOT EXISTS `terminal_authorizations` (
  `email` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `authorized_by` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_terminal_authorizations_status_updated`
ON `terminal_authorizations` (`status`, `updated_at`);
--> statement-breakpoint
PRAGMA optimize;
