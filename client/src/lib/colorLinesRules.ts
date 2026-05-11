export type ColorLinesCell = string | null;

const ORTHOGONAL_STEPS = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

function inBoard(board: ColorLinesCell[][], row: number, col: number) {
  return row >= 0 && row < board.length && col >= 0 && col < (board[row]?.length ?? 0);
}

function hasReachableEmptyCell(board: ColorLinesCell[][], startRow: number, startCol: number) {
  const visited = board.map((row) => row.map(() => false));
  const queue = [{ row: startRow, col: startCol }];
  visited[startRow][startCol] = true;

  while (queue.length) {
    const current = queue.shift()!;

    for (const step of ORTHOGONAL_STEPS) {
      const row = current.row + step.row;
      const col = current.col + step.col;
      if (!inBoard(board, row, col) || visited[row][col]) continue;

      if (board[row][col] === null) {
        return true;
      }

      visited[row][col] = true;
    }
  }

  return false;
}

export function hasAnyLegalMove(board: ColorLinesCell[][]) {
  const hasEmptyCell = board.some((row) => row.some((cell) => cell === null));
  if (!hasEmptyCell) return false;

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col] && hasReachableEmptyCell(board, row, col)) {
        return true;
      }
    }
  }

  return false;
}
