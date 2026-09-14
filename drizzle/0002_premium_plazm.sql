CREATE TABLE `comments` (
	`id` integer PRIMARY KEY NOT NULL,
	`issueId` integer NOT NULL,
	`authorLogin` text,
	`authorName` text,
	`authorAvatarUrl` text,
	`body` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
