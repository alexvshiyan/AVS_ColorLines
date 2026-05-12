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

/**
 * Check whether a given score qualifies for the top-5 leaderboard.
 * Returns the projected rank (1-based) and whether it would displace the current 5th place.
 */
export async function checkScoreQualifies(
  score: number,
): Promise<{ qualifies: boolean; rank: number; totalRecords: number }> {
  const db = await getDb();
  if (!db) {
    // If DB unavailable, allow submission optimistically
    return { qualifies: true, rank: 1, totalRecords: 0 };
  }

  const records = await listLeaderboardRecords(LEADERBOARD_MAX_LIMIT);
  const totalRecords = records.length;

  if (totalRecords < LEADERBOARD_MAX_LIMIT) {
    // Fewer than 5 records — always qualifies
    const rank = records.filter((r) => r.score > score).length + 1;
    return { qualifies: true, rank, totalRecords };
  }

  // Exactly 5 records — check if score beats the lowest (5th place)
  const lowestScore = records[records.length - 1]?.score ?? 0;
  if (score > lowestScore) {
    const rank = records.filter((r) => r.score > score).length + 1;
    return { qualifies: true, rank, totalRecords };
  }

  return { qualifies: false, rank: totalRecords + 1, totalRecords };
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
