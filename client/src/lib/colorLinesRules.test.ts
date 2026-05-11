import { describe, expect, it } from "vitest";
import { hasAnyLegalMove, type ColorLinesCell } from "./colorLinesRules";

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
