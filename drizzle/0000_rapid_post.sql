CREATE TABLE `issues` (
	`id` integer PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`repoFullName` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`state` text NOT NULL,
	`type` text NOT NULL,
	`priority` text NOT NULL,
	`labels` text NOT NULL,
	`assigneeLogin` text,
	`assigneeName` text,
	`assigneeAvatarUrl` text,
	`milestone` text,
	`dueDate` text,
	`subtasks` text DEFAULT '[]' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`htmlUrl` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repos` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`fullName` text NOT NULL,
	`isPrivate` integer NOT NULL,
	`openIssueCount` integer NOT NULL,
	`updatedAt` text NOT NULL,
	`tracked` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repos_fullName_unique` ON `repos` (`fullName`);