import { describe, expect, it } from "vitest";
import { hasAnyLegalMove, recommendColorLinesMove, type ColorLinesCell } from "./colorLinesRules";

function boardFromRows(rows: string[]): ColorLinesCell[][] {
  return rows.map((row) =>
    row.split("").map((cell) => {
      if (cell === ".") return null;
      return cell;
    }),
  );
}

describe("Color Lines legal move detection", () => {
  it("returns false when the board has no empty cells", () => {
    const board = boardFromRows(["RR", "BB"]);

    expect(hasAnyLegalMove(board)).toBe(false);
  });

  it("returns true when at least one marble can move into an empty cell", () => {
    const board = boardFromRows(["R.", "BB"]);

    expect(hasAnyLegalMove(board)).toBe(true);
  });

  it("returns false when empty cells exist but there are no marbles to move", () => {
    const board = boardFromRows(["...", "...", "..."]);

    expect(hasAnyLegalMove(board)).toBe(false);
  });
});

describe("Color Lines move recommendation", () => {
  it("recommends a move that completes an immediate five-marble line", () => {
    const board = boardFromRows([
      "RRRR.",
      ".....",
      ".....",
      ".....",
      "....R",
    ]);

    const recommendation = recommendColorLinesMove(board);

    expect(recommendation).not.toBeNull();
    expect(recommendation?.from).toEqual({ row: 4, col: 4 });
    expect(recommendation?.to).toEqual({ row: 0, col: 4 });
    expect(recommendation?.clearedCount).toBe(5);
    expect(recommendation?.gained).toBeGreaterThan(0);
  });

  it("returns null when no marble can be moved", () => {
    const board = boardFromRows(["RR", "BB"]);

    expect(recommendColorLinesMove(board)).toBeNull();
  });

  it("includes a legal path from source to destination", () => {
    const board = boardFromRows([
      "R..",
      ".B.",
      "...",
    ]);

    const recommendation = recommendColorLinesMove(board);

    expect(recommendation).not.toBeNull();
    expect(recommendation?.path[0]).toEqual(recommendation?.from);
    expect(recommendation?.path.at(-1)).toEqual(recommendation?.to);
    expect(recommendation?.path.length).toBeGreaterThan(1);
  });
});
