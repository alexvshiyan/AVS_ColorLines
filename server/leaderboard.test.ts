import { describe, expect, it } from "vitest";
import { leaderboardRecords } from "../drizzle/schema";
import {
  LEADERBOARD_DEFAULT_LIMIT,
  LEADERBOARD_MAX_LIMIT,
  PLAYER_LOCATION_FALLBACK,
  PLAYER_LOCATION_MAX_LENGTH,
  PLAYER_NAME_MAX_LENGTH,
  normalizeLeaderboardLimit,
  sanitizePlayerLocation,
  sanitizePlayerName,
} from "./leaderboard";

describe("leaderboard utilities", () => {
  it("sanitizes player names by trimming, collapsing whitespace, removing control characters, and limiting length", () => {
    const longName = `  Arcade\n\t Pilot ${"X".repeat(80)}  `;
    const sanitized = sanitizePlayerName(longName);

    expect(sanitized).toMatch(/^Arcade Pilot X+/);
    expect(sanitized).not.toContain("\n");
    expect(sanitized).not.toContain("\t");
    expect(Array.from(sanitized)).toHaveLength(PLAYER_NAME_MAX_LENGTH);
  });

  it("uses a safe fallback name when the submitted name is empty after sanitizing", () => {
    expect(sanitizePlayerName(" \n\t ")).toBe("Player");
  });

  it("normalizes leaderboard limits into the top-five supported range", () => {
    expect(LEADERBOARD_DEFAULT_LIMIT).toBe(5);
    expect(LEADERBOARD_MAX_LIMIT).toBe(5);
    expect(normalizeLeaderboardLimit(undefined)).toBe(LEADERBOARD_DEFAULT_LIMIT);
    expect(normalizeLeaderboardLimit(Number.NaN)).toBe(LEADERBOARD_DEFAULT_LIMIT);
    expect(normalizeLeaderboardLimit(-5)).toBe(1);
    expect(normalizeLeaderboardLimit(2.9)).toBe(2);
    expect(normalizeLeaderboardLimit(999)).toBe(LEADERBOARD_MAX_LIMIT);
  });

  it("sanitizes player locations and uses a fallback for missing legacy records", () => {
    const longLocation = `  Tokyo\n\t Arcade ${"District".repeat(20)}  `;
    const sanitized = sanitizePlayerLocation(longLocation);

    expect(sanitized).toMatch(/^Tokyo Arcade District/);
    expect(sanitized).not.toContain("\n");
    expect(sanitized).not.toContain("\t");
    expect(Array.from(sanitized)).toHaveLength(PLAYER_LOCATION_MAX_LENGTH);
    expect(sanitizePlayerLocation(undefined)).toBe(PLAYER_LOCATION_FALLBACK);
    expect(sanitizePlayerLocation(" \n\t ")).toBe(PLAYER_LOCATION_FALLBACK);
  });

  it("keeps leaderboard metadata columns available for the records UI", () => {
    expect(leaderboardRecords.createdAt).toBeDefined();
    expect(leaderboardRecords.location).toBeDefined();
  });
});
