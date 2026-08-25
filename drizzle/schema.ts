import { double, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

export const farms = mysqlTable("farms", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  crop: varchar("crop", { length: 120 }).notNull(),
  cedaCommodityId: int("cedaCommodityId"),
  areaAcres: double("areaAcres").notNull(),
  irrigationMethod: varchar("irrigationMethod", { length: 80 }).notNull(),
  latitude: double("latitude").notNull(),
  longitude: double("longitude").notNull(),
  locationLabel: text("locationLabel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("farms_owner_idx").on(table.ownerId)]);

export const diagnoses = mysqlTable("diagnoses", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  farmId: int("farmId").notNull(),
  crop: varchar("crop", { length: 120 }).notNull(),
  imageKey: varchar("imageKey", { length: 500 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 600 }).notNull(),
  status: mysqlEnum("status", ["uploaded", "analysing", "review", "complete", "failed"]).default("uploaded").notNull(),
  confidence: varchar("confidence", { length: 30 }),
  resultTitle: varchar("resultTitle", { length: 240 }),
  summary: text("summary"),
  evidence: text("evidence"),
  actions: text("actions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("diagnoses_owner_idx").on(table.ownerId), index("diagnoses_farm_idx").on(table.farmId)]);

export const harvestIntents = mysqlTable("harvest_intents", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  farmId: int("farmId").notNull(),
  expectedHarvestDate: varchar("expectedHarvestDate", { length: 10 }).notNull(),
  expectedQuantityQuintals: double("expectedQuantityQuintals").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["planning", "matching", "ready"]).default("planning").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("harvest_intents_owner_idx").on(table.ownerId), index("harvest_intents_farm_idx").on(table.farmId)]);

export type Farm = typeof farms.$inferSelect;
export type InsertFarm = typeof farms.$inferInsert;
export type Diagnosis = typeof diagnoses.$inferSelect;
export type HarvestIntent = typeof harvestIntents.$inferSelect;
export type InsertHarvestIntent = typeof harvestIntents.$inferInsert;
