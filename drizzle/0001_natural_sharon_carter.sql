CREATE TABLE `animal_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`notes` text,
	`weight_kg` int NOT NULL,
	`vem_target` int NOT NULL,
	`dve_target_grams` int NOT NULL,
	`max_bds_kg` decimal(5,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `animal_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `animal_profiles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `feeds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`basis` varchar(20) NOT NULL,
	`vem_per_unit` int NOT NULL,
	`dve_per_unit` int NOT NULL,
	`oeb_per_unit` int NOT NULL,
	`ca_per_unit` decimal(5,2) NOT NULL,
	`p_per_unit` decimal(5,2) NOT NULL,
	`default_ds_percent` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feeds_id` PRIMARY KEY(`id`),
	CONSTRAINT `feeds_name_unique` UNIQUE(`name`)
);
