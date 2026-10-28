CREATE TABLE `api_budget` (
	`id` text PRIMARY KEY NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL,
	`next_attempt` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL
);
