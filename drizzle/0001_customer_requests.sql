CREATE TABLE IF NOT EXISTS `customer_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `container_number` text NOT NULL,
  `reference` text NOT NULL,
  `operation` text NOT NULL,
  `preferred_date` text NOT NULL,
  `time_slot` text NOT NULL,
  `status` text DEFAULT 'Pendiente de validación' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customer_requests_user_created` ON `customer_requests` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customer_requests_container` ON `customer_requests` (`container_number`);
--> statement-breakpoint
PRAGMA optimize;
