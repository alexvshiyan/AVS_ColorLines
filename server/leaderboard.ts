import { asc, desc } from "drizzle-orm";
import { leaderboardRecords, type InsertLeaderboardRecord } from "../drizzle/schema";
import { getDb } from "./db";

export const LEADERBOARD_DEFAULT_LIMIT = 5;
export const LEADERBOARD_MAX_LIMIT = 5;
export const PLAYER_NAME_MAX_LENGTH = 24;
export const PLAYER_LOCATION_MAX_LENGTH = 40;
export const PLAYER_LOCATION_FALLBACK = "Unknown location";

export type CreateLeaderboardRecordInput = {
  playerName: string;
  score: number;
  moves: number;
  location?: string;
};

export function sanitizePlayerName(input: string): string {
  const collapsed = input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const limited = Array.from(collapsed).slice(0, PLAYER_NAME_MAX_LENGTH).join("");
  return limited || "Player";
}

export function sanitizePlayerLocation(input: string | undefined): string {
  const collapsed = (input ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  const limited = Array.from(collapsed).slice(0, PLAYER_LOCATION_MAX_LENGTH).join("");
  return limited || PLAYER_LOCATION_FALLBACK;
}

export function normalizeLeaderboardLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit ?? LEADERBOARD_DEFAULT_LIMIT)) return LEADERBOARD_DEFAULT_LIMIT;
  const integerLimit = Math.trunc(limit ?? LEADERBOARD_DEFAULT_LIMIT);
  return Math.min(Math.max(integerLimit, 1), LEADERBOARD_MAX_LIMIT);
}

export async function listLeaderboardRecords(limit?: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Leaderboard] Cannot list records: database not available");
    return [];
  }

  return db
    .select()
    .from(leaderboardRecords)
    .orderBy(desc(leaderboardRecords.score), asc(leaderboardRecords.moves), asc(leaderboardRecords.createdAt))
    .limit(normalizeLeaderboardLimit(limit));
}

export async function createLeaderboardRecord(input: CreateLeaderboardRecordInput) {
  const db = await getDb();
  if (!db) {
    throw new Error("Leaderboard database is not available");
  }

  const values: InsertLeaderboardRecord = {
    playerName: sanitizePlayerName(input.playerName),
    score: Math.trunc(input.score),
    moves: Math.trunc(input.moves),
    location: sanitizePlayerLocation(input.location),
  };

  await db.insert(leaderboardRecords).values(values);
  const [created] = await db
    .select()
    .from(leaderboardRecords)
    .orderBy(desc(leaderboardRecords.id))
    .limit(1);

  if (!created) {
    throw new Error("Leaderboard record was not created");
  }

  return created;
}
