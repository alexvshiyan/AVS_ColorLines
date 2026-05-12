import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export const leaderboardRecords = mysqlTable(
  "leaderboard_records",
  {
    id: int("id").autoincrement().primaryKey(),
    playerName: varchar("playerName", { length: 32 }).notNull(),
    score: int("score").notNull(),
    moves: int("moves").notNull(),
    location: varchar("location", { length: 80 }).default("Unknown location").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    scoreIdx: index("leaderboard_score_idx").on(table.score),
    createdAtIdx: index("leaderboard_created_at_idx").on(table.createdAt),
  }),
);

export type LeaderboardRecord = typeof leaderboardRecords.$inferSelect;
export type InsertLeaderboardRecord = typeof leaderboardRecords.$inferInsert;
