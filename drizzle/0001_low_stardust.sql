CREATE TABLE `sync_etags` (
	`url` text PRIMARY KEY NOT NULL,
	`etag` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `repos` ADD `syncCursor` text;