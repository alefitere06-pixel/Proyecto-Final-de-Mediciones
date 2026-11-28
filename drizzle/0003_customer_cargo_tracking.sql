CREATE TABLE IF NOT EXISTS `customer_cargo_links` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `container_number` text NOT NULL,
  `booking_reference` text NOT NULL,
  `document_type` text NOT NULL,
  `document_reference` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `current_location` text DEFAULT 'Pendiente de validación con terminal' NOT NULL,
  `eta` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cargo_events` (
  `id` text PRIMARY KEY NOT NULL,
  `cargo_link_id` text NOT NULL,
  `status` text NOT NULL,
  `title` text NOT NULL,
  `detail` text NOT NULL,
  `source` text DEFAULT 'GateFlow' NOT NULL,
  `event_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `customer_credentials` (
  `user_id` text PRIMARY KEY NOT NULL,
  `password_salt` text NOT NULL,
  `password_hash` text NOT NULL,
  `failed_attempts` integer DEFAULT 0 NOT NULL,
  `locked_until` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customer_cargo_user_created`
ON `customer_cargo_links` (`user_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_customer_cargo_container_status`
ON `customer_cargo_links` (`container_number`, `status`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_customer_cargo_owner_booking`
ON `customer_cargo_links` (`user_id`, `container_number`, `booking_reference`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_cargo_events_link_event`
ON `cargo_events` (`cargo_link_id`, `event_at`);
--> statement-breakpoint
PRAGMA optimize;
