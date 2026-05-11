import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_DEFAULT_LIMIT,
  LEADERBOARD_MAX_LIMIT,
  PLAYER_NAME_MAX_LENGTH,
  normalizeLeaderboardLimit,
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

  it("normalizes leaderboard limits into the supported range", () => {
    expect(normalizeLeaderboardLimit(undefined)).toBe(LEADERBOARD_DEFAULT_LIMIT);
    expect(normalizeLeaderboardLimit(Number.NaN)).toBe(LEADERBOARD_DEFAULT_LIMIT);
    expect(normalizeLeaderboardLimit(-5)).toBe(1);
    expect(normalizeLeaderboardLimit(2.9)).toBe(2);
    expect(normalizeLeaderboardLimit(999)).toBe(LEADERBOARD_MAX_LIMIT);
  });
});
