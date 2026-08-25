CREATE TABLE `diagnoses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`farmId` int NOT NULL,
	`crop` varchar(120) NOT NULL,
	`imageKey` varchar(500) NOT NULL,
	`imageUrl` varchar(600) NOT NULL,
	`status` enum('uploaded','analysing','review','complete','failed') NOT NULL DEFAULT 'uploaded',
	`confidence` varchar(30),
	`resultTitle` varchar(240),
	`summary` text,
	`evidence` text,
	`actions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diagnoses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `farms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`crop` varchar(120) NOT NULL,
	`cedaCommodityId` int,
	`areaAcres` double NOT NULL,
	`irrigationMethod` varchar(80) NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`locationLabel` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `farms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `diagnoses_owner_idx` ON `diagnoses` (`ownerId`);--> statement-breakpoint
CREATE INDEX `diagnoses_farm_idx` ON `diagnoses` (`farmId`);--> statement-breakpoint
CREATE INDEX `farms_owner_idx` ON `farms` (`ownerId`);