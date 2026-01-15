import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Animal profiles table - stores the 4 animal types with their nutritional requirements
 * Based on 2025 Dutch Ruminant Nutrition Standards (CVB)
 */
export const animalProfiles = mysqlTable("animal_profiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  notes: text("notes"),
  weightKg: int("weight_kg").notNull(),
  vemTarget: int("vem_target").notNull(),
  dveTargetGrams: int("dve_target_grams").notNull(),
  maxBdsKg: decimal("max_bds_kg", { precision: 5, scale: 2 }).notNull(),
  parity: int("parity").default(3), // Lactation number (1 = first lactation, 2+= mature cow)
  daysInMilk: int("days_in_milk").default(100), // Days since calving (DIM)
  daysPregnant: int("days_pregnant").default(0), // Days pregnant (0 if not pregnant)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnimalProfile = typeof animalProfiles.$inferSelect;
export type InsertAnimalProfile = typeof animalProfiles.$inferInsert;

/**
 * Feeds table - central library of feedstuffs with nutritional values
 * Values are per kg DS (dry matter) for roughage, per kg product for concentrates
 */
export const feeds = mysqlTable("feeds", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  basis: varchar("basis", { length: 20 }).notNull(), // 'per kg DS' or 'per kg product'
  vemPerUnit: int("vem_per_unit").notNull(),
  dvePerUnit: int("dve_per_unit").notNull(),
  oebPerUnit: int("oeb_per_unit").notNull(),
  caPerUnit: decimal("ca_per_unit", { precision: 5, scale: 2 }).notNull(),
  pPerUnit: decimal("p_per_unit", { precision: 5, scale: 2 }).notNull(),
  defaultDsPercent: int("default_ds_percent").notNull(), // Stored as percentage (e.g., 45 for 45%)
  swPerKgDs: decimal("sw_per_kg_ds", { precision: 4, scale: 2 }).notNull().default("0.00"), // Structure Value per kg DS
  vwPerKgDs: decimal("vw_per_kg_ds", { precision: 4, scale: 2 }).default("0.00"), // Verzadigingswaarde (Filling Value) per kg DS
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feed = typeof feeds.$inferSelect;
export type InsertFeed = typeof feeds.$inferInsert;
