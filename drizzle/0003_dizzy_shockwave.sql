CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`userId` int,
	`eventName` varchar(80) NOT NULL,
	`category` varchar(40) NOT NULL DEFAULT 'game',
	`page` varchar(120) NOT NULL DEFAULT '/',
	`metadata` text,
	`locale` varchar(32),
	`timezone` varchar(64),
	`viewport` varchar(32),
	`displayMode` varchar(32),
	`userAgent` text,
	`browser` varchar(80),
	`platform` varchar(80),
	`location` varchar(80) NOT NULL DEFAULT 'Unknown',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_sessions` (
	`sessionId` varchar(64) NOT NULL,
	`userId` int,
	`eventCount` int NOT NULL DEFAULT 0,
	`lastEventName` varchar(80),
	`locale` varchar(32),
	`timezone` varchar(64),
	`viewport` varchar(32),
	`displayMode` varchar(32),
	`userAgent` text,
	`browser` varchar(80),
	`platform` varchar(80),
	`location` varchar(80) NOT NULL DEFAULT 'Unknown',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_sessions_sessionId` PRIMARY KEY(`sessionId`)
);
--> statement-breakpoint
CREATE INDEX `analytics_events_event_name_idx` ON `analytics_events` (`eventName`);--> statement-breakpoint
CREATE INDEX `analytics_events_session_idx` ON `analytics_events` (`sessionId`);--> statement-breakpoint
CREATE INDEX `analytics_events_user_idx` ON `analytics_events` (`userId`);--> statement-breakpoint
CREATE INDEX `analytics_events_created_at_idx` ON `analytics_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `player_sessions_last_seen_at_idx` ON `player_sessions` (`lastSeenAt`);--> statement-breakpoint
CREATE INDEX `player_sessions_user_idx` ON `player_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `player_sessions_location_idx` ON `player_sessions` (`location`);