CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`tabGroupsEnabled` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tab_layout` (
	`id` integer PRIMARY KEY NOT NULL,
	`layout` text DEFAULT '[]' NOT NULL
);
