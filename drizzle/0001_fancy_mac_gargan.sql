CREATE TABLE `harvest_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`farmId` int NOT NULL,
	`expectedHarvestDate` varchar(10) NOT NULL,
	`expectedQuantityQuintals` double NOT NULL,
	`notes` text,
	`status` enum('planning','matching','ready') NOT NULL DEFAULT 'planning',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `harvest_intents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `harvest_intents_owner_idx` ON `harvest_intents` (`ownerId`);--> statement-breakpoint
CREATE INDEX `harvest_intents_farm_idx` ON `harvest_intents` (`farmId`);