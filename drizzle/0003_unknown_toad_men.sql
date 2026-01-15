ALTER TABLE `animal_profiles` ADD `parity` int DEFAULT 3;--> statement-breakpoint
ALTER TABLE `animal_profiles` ADD `days_in_milk` int DEFAULT 100;--> statement-breakpoint
ALTER TABLE `animal_profiles` ADD `days_pregnant` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `feeds` ADD `vw_per_kg_ds` decimal(4,2) DEFAULT '0.00';