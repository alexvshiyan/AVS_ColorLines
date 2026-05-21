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

export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: varchar("sessionId", { length: 64 }).notNull(),
    userId: int("userId"),
    eventName: varchar("eventName", { length: 80 }).notNull(),
    category: varchar("category", { length: 40 }).default("game").notNull(),
    page: varchar("page", { length: 120 }).default("/").notNull(),
    metadata: text("metadata"),
    locale: varchar("locale", { length: 32 }),
    timezone: varchar("timezone", { length: 64 }),
    viewport: varchar("viewport", { length: 32 }),
    displayMode: varchar("displayMode", { length: 32 }),
    userAgent: text("userAgent"),
    browser: varchar("browser", { length: 80 }),
    platform: varchar("platform", { length: 80 }),
    location: varchar("location", { length: 80 }).default("Unknown").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    eventNameIdx: index("analytics_events_event_name_idx").on(table.eventName),
    sessionIdx: index("analytics_events_session_idx").on(table.sessionId),
    userIdx: index("analytics_events_user_idx").on(table.userId),
    createdAtIdx: index("analytics_events_created_at_idx").on(table.createdAt),
  }),
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

export const playerSessions = mysqlTable(
  "player_sessions",
  {
    sessionId: varchar("sessionId", { length: 64 }).primaryKey(),
    userId: int("userId"),
    eventCount: int("eventCount").default(0).notNull(),
    lastEventName: varchar("lastEventName", { length: 80 }),
    locale: varchar("locale", { length: 32 }),
    timezone: varchar("timezone", { length: 64 }),
    viewport: varchar("viewport", { length: 32 }),
    displayMode: varchar("displayMode", { length: 32 }),
    userAgent: text("userAgent"),
    browser: varchar("browser", { length: 80 }),
    platform: varchar("platform", { length: 80 }),
    location: varchar("location", { length: 80 }).default("Unknown").notNull(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    lastSeenAtIdx: index("player_sessions_last_seen_at_idx").on(table.lastSeenAt),
    userIdx: index("player_sessions_user_idx").on(table.userId),
    locationIdx: index("player_sessions_location_idx").on(table.location),
  }),
);

export type PlayerSession = typeof playerSessions.$inferSelect;
export type InsertPlayerSession = typeof playerSessions.$inferInsert;
