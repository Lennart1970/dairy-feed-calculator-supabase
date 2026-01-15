import { integer, pgTable, text, timestamp, varchar, decimal, serial } from "drizzle-orm/pg-core";

/**
 * Users table for simple authentication
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Animal profiles table - stores the 4 animal types with their nutritional requirements
 * Based on 2025 Dutch Ruminant Nutrition Standards (CVB)
 */
export const animalProfiles = pgTable("animal_profiles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  notes: text("notes"),
  weightKg: integer("weight_kg").notNull(),
  vemTarget: integer("vem_target").notNull(),
  dveTargetGrams: integer("dve_target_grams").notNull(),
  maxBdsKg: decimal("max_bds_kg", { precision: 5, scale: 2 }).notNull(),
  parity: integer("parity").default(3),
  daysInMilk: integer("days_in_milk").default(100),
  daysPregnant: integer("days_pregnant").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AnimalProfile = typeof animalProfiles.$inferSelect;
export type InsertAnimalProfile = typeof animalProfiles.$inferInsert;

/**
 * Feeds table - central library of feedstuffs with nutritional values
 * Values are per kg DS (dry matter) for roughage, per kg product for concentrates
 */
export const feeds = pgTable("feeds", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  basis: varchar("basis", { length: 20 }).notNull(),
  vemPerUnit: integer("vem_per_unit").notNull(),
  dvePerUnit: integer("dve_per_unit").notNull(),
  oebPerUnit: integer("oeb_per_unit").notNull(),
  caPerUnit: decimal("ca_per_unit", { precision: 5, scale: 2 }).notNull(),
  pPerUnit: decimal("p_per_unit", { precision: 5, scale: 2 }).notNull(),
  defaultDsPercent: integer("default_ds_percent").notNull(),
  swPerKgDs: decimal("sw_per_kg_ds", { precision: 4, scale: 2 }).default("0.00").notNull(),
  vwPerKgDs: decimal("vw_per_kg_ds", { precision: 4, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Feed = typeof feeds.$inferSelect;
export type InsertFeed = typeof feeds.$inferInsert;
