CREATE TABLE `leaderboard_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerName` varchar(32) NOT NULL,
	`score` int NOT NULL,
	`moves` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leaderboard_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `leaderboard_score_idx` ON `leaderboard_records` (`score`);--> statement-breakpoint
CREATE INDEX `leaderboard_created_at_idx` ON `leaderboard_records` (`createdAt`);