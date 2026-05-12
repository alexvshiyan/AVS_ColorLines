export type ColorLinesCell = string | null;

export type ColorLinesPosition = { row: number; col: number };

export type ColorLinesMoveRecommendation = {
  from: ColorLinesPosition;
  to: ColorLinesPosition;
  path: ColorLinesPosition[];
  color: string;
  value: number;
  gained: number;
  clearedCount: number;
};

const LINE_LENGTH = 5;
const ORTHOGONAL_STEPS: ColorLinesPosition[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];
const LINE_DIRECTIONS: ColorLinesPosition[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
];

function inBoard(board: ColorLinesCell[][], row: number, col: number) {
  return row >= 0 && row < board.length && col >= 0 && col < (board[row]?.length ?? 0);
}

function samePosition(a: ColorLinesPosition, b: ColorLinesPosition) {
  return a.row === b.row && a.col === b.col;
}

function cloneBoard(board: ColorLinesCell[][]) {
  return board.map((row) => [...row]);
}

function keyOf(position: ColorLinesPosition) {
  return `${position.row}-${position.col}`;
}

function getEmptyCells(board: ColorLinesCell[][]): ColorLinesPosition[] {
  const cells: ColorLinesPosition[] = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col] === null) cells.push({ row, col });
    }
  }
  return cells;
}

function getOccupiedCells(board: ColorLinesCell[][]): Array<ColorLinesPosition & { color: string }> {
  const cells: Array<ColorLinesPosition & { color: string }> = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const color = board[row][col];
      if (color) cells.push({ row, col, color });
    }
  }
  return cells;
}

function scoreForCleared(count: number) {
  return count <= 0 ? 0 : count * 2 + Math.max(0, count - LINE_LENGTH) * 3;
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

export function findColorLinesPath(board: ColorLinesCell[][], start: ColorLinesPosition, end: ColorLinesPosition): ColorLinesPosition[] {
  if (!inBoard(board, start.row, start.col) || !inBoard(board, end.row, end.col) || board[end.row][end.col] !== null) return [];

  const queue: ColorLinesPosition[] = [{ row: start.row, col: start.col }];
  const visited = board.map((row) => row.map(() => false));
  const previous = board.map((row) => row.map<ColorLinesPosition | null>(() => null));
  visited[start.row][start.col] = true;

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (samePosition(current, end)) {
      const path: ColorLinesPosition[] = [];
      let cursor: ColorLinesPosition | null = current;
      while (cursor) {
        path.unshift(cursor);
        cursor = previous[cursor.row][cursor.col];
      }
      return path;
    }

    for (const step of ORTHOGONAL_STEPS) {
      const row = current.row + step.row;
      const col = current.col + step.col;
      if (!inBoard(board, row, col) || visited[row][col]) continue;
      if (board[row][col] !== null && !(row === end.row && col === end.col)) continue;
      visited[row][col] = true;
      previous[row][col] = current;
      queue.push({ row, col });
    }
  }

  return [];
}

function detectLines(board: ColorLinesCell[][]): ColorLinesPosition[] {
  const cleared = new Set<string>();

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const color = board[row][col];
      if (!color) continue;

      for (const direction of LINE_DIRECTIONS) {
        const beforeRow = row - direction.row;
        const beforeCol = col - direction.col;
        if (inBoard(board, beforeRow, beforeCol) && board[beforeRow][beforeCol] === color) continue;

        const run: ColorLinesPosition[] = [];
        let currentRow = row;
        let currentCol = col;
        while (inBoard(board, currentRow, currentCol) && board[currentRow][currentCol] === color) {
          run.push({ row: currentRow, col: currentCol });
          currentRow += direction.row;
          currentCol += direction.col;
        }

        if (run.length >= LINE_LENGTH) {
          run.forEach((position) => cleared.add(keyOf(position)));
        }
      }
    }
  }

  return Array.from(cleared).map((key) => {
    const [row, col] = key.split("-").map(Number);
    return { row, col };
  });
}

function removeCells(board: ColorLinesCell[][], cells: ColorLinesPosition[]) {
  const nextBoard = cloneBoard(board);
  cells.forEach(({ row, col }) => {
    nextBoard[row][col] = null;
  });
  return nextBoard;
}

function applyMoveNoSpawn(board: ColorLinesCell[][], move: { from: ColorLinesPosition; to: ColorLinesPosition; color: string }) {
  const nextBoard = cloneBoard(board);
  nextBoard[move.from.row][move.from.col] = null;
  nextBoard[move.to.row][move.to.col] = move.color;
  const cleared = detectLines(nextBoard);

  return {
    board: cleared.length ? removeCells(nextBoard, cleared) : nextBoard,
    cleared,
    gained: scoreForCleared(cleared.length),
  };
}

function maxRunLength(board: ColorLinesCell[][]) {
  let best = 0;
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const color = board[row][col];
      if (!color) continue;
      for (const direction of LINE_DIRECTIONS) {
        let length = 0;
        let currentRow = row;
        let currentCol = col;
        while (inBoard(board, currentRow, currentCol) && board[currentRow][currentCol] === color) {
          length += 1;
          currentRow += direction.row;
          currentCol += direction.col;
        }
        best = Math.max(best, length);
      }
    }
  }
  return best;
}

function potentialScore(board: ColorLinesCell[][]) {
  let total = 0;
  for (const direction of LINE_DIRECTIONS) {
    const starts: ColorLinesPosition[] = [];
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row].length; col += 1) {
        const endRow = row + direction.row * (LINE_LENGTH - 1);
        const endCol = col + direction.col * (LINE_LENGTH - 1);
        if (inBoard(board, endRow, endCol)) starts.push({ row, col });
      }
    }
    for (const start of starts) {
      const counts = new Map<string, number>();
      let empties = 0;
      for (let i = 0; i < LINE_LENGTH; i += 1) {
        const cell = board[start.row + direction.row * i][start.col + direction.col * i];
        if (!cell) empties += 1;
        else counts.set(cell, (counts.get(cell) ?? 0) + 1);
      }
      for (const count of Array.from(counts.values())) {
        if (count === 4 && empties === 1) total += 250;
        else if (count === 3 && empties === 2) total += 48;
        else if (count === 2 && empties === 3) total += 8;
      }
    }
  }
  return total;
}

function colorAdjacency(board: ColorLinesCell[][]) {
  let total = 0;
  for (const { row, col, color } of getOccupiedCells(board)) {
    for (const step of ORTHOGONAL_STEPS) {
      const nextRow = row + step.row;
      const nextCol = col + step.col;
      if (inBoard(board, nextRow, nextCol) && board[nextRow][nextCol] === color) total += 1;
    }
  }
  return total / 2;
}

function componentPenalty(board: ColorLinesCell[][]) {
  const visited = board.map((row) => row.map(() => false));
  let components = 0;
  let largest = 0;

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col] !== null || visited[row][col]) continue;
      components += 1;
      const queue = [{ row, col }];
      visited[row][col] = true;
      let size = 0;

      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];
        size += 1;
        for (const step of ORTHOGONAL_STEPS) {
          const nextRow = current.row + step.row;
          const nextCol = current.col + step.col;
          if (!inBoard(board, nextRow, nextCol) || visited[nextRow][nextCol] || board[nextRow][nextCol] !== null) continue;
          visited[nextRow][nextCol] = true;
          queue.push({ row: nextRow, col: nextCol });
        }
      }

      largest = Math.max(largest, size);
    }
  }

  return components * 20 - largest * 1.8;
}

function centerScore(board: ColorLinesCell[][], position: ColorLinesPosition) {
  const centerRow = (board.length - 1) / 2;
  const centerCol = ((board[0]?.length ?? 1) - 1) / 2;
  const rowDistance = Math.abs(position.row - centerRow);
  const colDistance = Math.abs(position.col - centerCol);
  return 8 - (rowDistance + colDistance);
}

function boardHeuristic(board: ColorLinesCell[][], gained = 0) {
  const empties = getEmptyCells(board).length;
  return gained * 1600 + potentialScore(board) * 3.8 + maxRunLength(board) * 35 + colorAdjacency(board) * 18 + empties * 13 - componentPenalty(board);
}

export function recommendColorLinesMove(board: ColorLinesCell[][]): ColorLinesMoveRecommendation | null {
  let best: ColorLinesMoveRecommendation | null = null;

  for (const source of getOccupiedCells(board)) {
    for (const destination of getEmptyCells(board)) {
      const path = findColorLinesPath(board, source, destination);
      if (!path.length) continue;

      const applied = applyMoveNoSpawn(board, { from: source, to: destination, color: source.color });
      const value = boardHeuristic(applied.board, applied.gained) + centerScore(board, destination);
      const candidate: ColorLinesMoveRecommendation = {
        from: { row: source.row, col: source.col },
        to: destination,
        path,
        color: source.color,
        value,
        gained: applied.gained,
        clearedCount: applied.cleared.length,
      };

      if (!best || candidate.value > best.value) {
        best = candidate;
      }
    }
  }

  return best;
}
