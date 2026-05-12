const BOARD_SIZE = 9;
const STARTING_BALLS = 5;
const NEXT_BALLS = 3;
const LINE_LENGTH = 5;
const COLORS = ["red", "cyan", "yellow", "green", "magenta", "blue", "orange"];
const DIRECTIONS = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
];
const ORTHOGONAL = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

function makeRng(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    },
    int(max) {
      return Math.floor(this.next() * max);
    },
    fork(salt) {
      return makeRng((state ^ ((salt * 2654435761) >>> 0)) >>> 0);
    },
  };
}

function makeEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function randomColor(rng) {
  return COLORS[rng.int(COLORS.length)];
}

function randomNextBalls(rng) {
  return Array.from({ length: NEXT_BALLS }, () => randomColor(rng));
}

function getEmptyCells(board) {
  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!board[row][col]) cells.push({ row, col });
    }
  }
  return cells;
}

function getOccupiedCells(board) {
  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col]) cells.push({ row, col, color: board[row][col] });
    }
  }
  return cells;
}

function placeRandomBalls(board, colors, rng) {
  const nextBoard = cloneBoard(board);
  const empties = getEmptyCells(nextBoard);
  for (const color of colors) {
    if (!empties.length) break;
    const index = rng.int(empties.length);
    const [cell] = empties.splice(index, 1);
    nextBoard[cell.row][cell.col] = color;
  }
  return nextBoard;
}

function buildInitialState(rng) {
  const board = placeRandomBalls(makeEmptyBoard(), Array.from({ length: STARTING_BALLS }, () => randomColor(rng)), rng);
  return { board, nextBalls: randomNextBalls(rng), score: 0, moves: 0 };
}

function keyOf(position) {
  return `${position.row}-${position.col}`;
}

function detectLines(board) {
  const cleared = new Set();
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const color = board[row][col];
      if (!color) continue;
      for (const direction of DIRECTIONS) {
        const beforeRow = row - direction.row;
        const beforeCol = col - direction.col;
        if (inBounds(beforeRow, beforeCol) && board[beforeRow][beforeCol] === color) continue;
        const run = [];
        let currentRow = row;
        let currentCol = col;
        while (inBounds(currentRow, currentCol) && board[currentRow][currentCol] === color) {
          run.push({ row: currentRow, col: currentCol });
          currentRow += direction.row;
          currentCol += direction.col;
        }
        if (run.length >= LINE_LENGTH) {
          for (const position of run) cleared.add(keyOf(position));
        }
      }
    }
  }
  return [...cleared].map((key) => {
    const [row, col] = key.split("-").map(Number);
    return { row, col };
  });
}

function removeCells(board, cells) {
  const nextBoard = cloneBoard(board);
  for (const { row, col } of cells) nextBoard[row][col] = null;
  return nextBoard;
}

function scoreForCleared(count) {
  return count <= 0 ? 0 : count * 2 + Math.max(0, count - LINE_LENGTH) * 3;
}

function legalMoves(board) {
  const moves = [];
  const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== null || visited[row][col]) continue;

      const empties = [];
      const adjacentSources = new Map();
      const queue = [{ row, col }];
      visited[row][col] = true;

      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];
        empties.push(current);

        for (const step of ORTHOGONAL) {
          const nr = current.row + step.row;
          const nc = current.col + step.col;
          if (!inBounds(nr, nc)) continue;

          if (board[nr][nc] === null) {
            if (!visited[nr][nc]) {
              visited[nr][nc] = true;
              queue.push({ row: nr, col: nc });
            }
          } else {
            adjacentSources.set(`${nr}-${nc}`, { row: nr, col: nc, color: board[nr][nc] });
          }
        }
      }

      for (const source of adjacentSources.values()) {
        for (const destination of empties) {
          moves.push({ from: { row: source.row, col: source.col }, to: destination, color: source.color });
        }
      }
    }
  }

  return moves;
}

function hasAnyLegalMove(board) {
  return legalMoves(board).length > 0;
}

function sampledMoves(board, rng, limit = 320) {
  const moves = legalMoves(board);
  if (moves.length <= limit) return moves;
  const sampled = [];
  const used = new Set();
  while (sampled.length < limit) {
    const index = rng.int(moves.length);
    if (used.has(index)) continue;
    used.add(index);
    sampled.push(moves[index]);
  }
  return sampled;
}

function applyMoveNoSpawn(board, move) {
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

function applyFullTurn(state, move, rng) {
  const moved = applyMoveNoSpawn(state.board, move);
  let board = moved.board;
  let gained = moved.gained;
  let nextBalls = state.nextBalls;
  if (!moved.cleared.length) {
    const withNewBalls = placeRandomBalls(board, state.nextBalls, rng);
    const postSpawnClears = detectLines(withNewBalls);
    board = postSpawnClears.length ? removeCells(withNewBalls, postSpawnClears) : withNewBalls;
    gained += scoreForCleared(postSpawnClears.length);
    nextBalls = randomNextBalls(rng);
  }
  return { board, nextBalls, score: state.score + gained, moves: state.moves + 1, gained };
}

function maxRunLength(board) {
  let best = 0;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const color = board[row][col];
      if (!color) continue;
      for (const direction of DIRECTIONS) {
        let length = 0;
        let currentRow = row;
        let currentCol = col;
        while (inBounds(currentRow, currentCol) && board[currentRow][currentCol] === color) {
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

function potentialScore(board) {
  let total = 0;
  for (const direction of DIRECTIONS) {
    const starts = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const endRow = row + direction.row * (LINE_LENGTH - 1);
        const endCol = col + direction.col * (LINE_LENGTH - 1);
        if (inBounds(endRow, endCol)) starts.push({ row, col });
      }
    }
    for (const start of starts) {
      const counts = new Map();
      let empties = 0;
      for (let i = 0; i < LINE_LENGTH; i += 1) {
        const cell = board[start.row + direction.row * i][start.col + direction.col * i];
        if (!cell) empties += 1;
        else counts.set(cell, (counts.get(cell) ?? 0) + 1);
      }
      for (const count of counts.values()) {
        if (count === 4 && empties === 1) total += 250;
        else if (count === 3 && empties === 2) total += 48;
        else if (count === 2 && empties === 3) total += 8;
      }
    }
  }
  return total;
}

function colorAdjacency(board) {
  let total = 0;
  for (const { row, col, color } of getOccupiedCells(board)) {
    for (const step of ORTHOGONAL) {
      const nr = row + step.row;
      const nc = col + step.col;
      if (inBounds(nr, nc) && board[nr][nc] === color) total += 1;
    }
  }
  return total / 2;
}

function componentPenalty(board) {
  const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
  let components = 0;
  let largest = 0;
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== null || visited[row][col]) continue;
      components += 1;
      const queue = [{ row, col }];
      visited[row][col] = true;
      let size = 0;
      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];
        size += 1;
        for (const step of ORTHOGONAL) {
          const nr = current.row + step.row;
          const nc = current.col + step.col;
          if (!inBounds(nr, nc) || visited[nr][nc] || board[nr][nc] !== null) continue;
          visited[nr][nc] = true;
          queue.push({ row: nr, col: nc });
        }
      }
      largest = Math.max(largest, size);
    }
  }
  return components * 20 - largest * 1.8;
}

function centerScore(move) {
  const dr = Math.abs(move.to.row - 4);
  const dc = Math.abs(move.to.col - 4);
  return 8 - (dr + dc);
}

function boardHeuristic(board, gained = 0) {
  const empties = getEmptyCells(board).length;
  return (
    gained * 1600 +
    potentialScore(board) * 3.8 +
    maxRunLength(board) * 35 +
    colorAdjacency(board) * 18 +
    empties * 13 -
    componentPenalty(board)
  );
}

function chooseRandom(state, rng) {
  const moves = legalMoves(state.board);
  return moves[rng.int(moves.length)];
}

function chooseGreedyClear(state, rng) {
  const moves = sampledMoves(state.board, rng, 320);
  let best = [];
  let bestValue = -Infinity;
  for (const move of moves) {
    const applied = applyMoveNoSpawn(state.board, move);
    const value = applied.gained * 10000 + potentialScore(applied.board) + centerScore(move);
    if (value > bestValue) {
      bestValue = value;
      best = [move];
    } else if (value === bestValue) best.push(move);
  }
  return best[rng.int(best.length)];
}

function chooseHeuristic(state, rng) {
  const moves = sampledMoves(state.board, rng, 320);
  let best = [];
  let bestValue = -Infinity;
  for (const move of moves) {
    const applied = applyMoveNoSpawn(state.board, move);
    const value = boardHeuristic(applied.board, applied.gained) + centerScore(move);
    if (value > bestValue) {
      bestValue = value;
      best = [move];
    } else if (Math.abs(value - bestValue) < 1e-9) best.push(move);
  }
  return best[rng.int(best.length)];
}

function chooseMobility(state, rng) {
  const moves = sampledMoves(state.board, rng, 320);
  let best = [];
  let bestValue = -Infinity;
  for (const move of moves) {
    const applied = applyMoveNoSpawn(state.board, move);
    const empties = getEmptyCells(applied.board).length;
    const value = applied.gained * 1400 + legalMoves(applied.board).length * 0.7 + empties * 28 + potentialScore(applied.board) * 0.8;
    if (value > bestValue) {
      bestValue = value;
      best = [move];
    } else if (Math.abs(value - bestValue) < 1e-9) best.push(move);
  }
  return best[rng.int(best.length)];
}

function topHeuristicMoves(state, limit, rng) {
  return sampledMoves(state.board, rng, 420)
    .map((move) => {
      const applied = applyMoveNoSpawn(state.board, move);
      return { move, value: boardHeuristic(applied.board, applied.gained) + centerScore(move) };
    })
    .sort((a, b) => b.value - a.value || rng.next() - 0.5)
    .slice(0, limit)
    .map((entry) => entry.move);
}

function chooseSpawnAware(state, rng, samples = 10, candidateLimit = 18) {
  const candidates = topHeuristicMoves(state, candidateLimit, rng);
  let best = [];
  let bestValue = -Infinity;
  let salt = 1;
  for (const move of candidates) {
    const immediate = applyMoveNoSpawn(state.board, move);
    let value = immediate.gained * 2200 + boardHeuristic(immediate.board, immediate.gained) * 0.55;
    if (immediate.cleared.length) {
      value += 7000;
    } else {
      let sampled = 0;
      for (let i = 0; i < samples; i += 1) {
        const sampleRng = rng.fork(salt++);
        const withNew = placeRandomBalls(immediate.board, state.nextBalls, sampleRng);
        const spawnedClear = detectLines(withNew);
        const afterSpawn = spawnedClear.length ? removeCells(withNew, spawnedClear) : withNew;
        const gained = scoreForCleared(spawnedClear.length);
        sampled += boardHeuristic(afterSpawn, gained) + gained * 2200;
      }
      value += sampled / samples;
    }
    if (value > bestValue) {
      bestValue = value;
      best = [move];
    } else if (Math.abs(value - bestValue) < 1e-9) best.push(move);
  }
  return best[rng.int(best.length)];
}

const STRATEGIES = {
  random: (state, rng) => chooseRandom(state, rng),
  greedy_clear: (state, rng) => chooseGreedyClear(state, rng),
  mobility: (state, rng) => chooseMobility(state, rng),
  line_builder: (state, rng) => chooseHeuristic(state, rng),
  spawn_aware: (state, rng) => chooseSpawnAware(state, rng, 6, 12),
  spawn_aware_deep: (state, rng) => chooseSpawnAware(state, rng, 10, 16),
};

function simulateGame(strategyName, seed, maxTurns = 500) {
  const rng = makeRng(seed);
  const strategy = STRATEGIES[strategyName];
  let state = buildInitialState(rng);
  let emptyCellsBeforeTurns = 0;
  let legalMovesBeforeTurns = 0;
  while (state.moves < maxTurns) {
    const availableMoves = legalMoves(state.board);
    if (!availableMoves.length) break;
    emptyCellsBeforeTurns += getEmptyCells(state.board).length;
    legalMovesBeforeTurns += availableMoves.length;
    const move = strategy(state, rng);
    if (!move) break;
    state = applyFullTurn(state, move, rng);
  }
  return {
    strategy: strategyName,
    seed,
    score: state.score,
    moves: state.moves,
    occupied: BOARD_SIZE * BOARD_SIZE - getEmptyCells(state.board).length,
    empty: getEmptyCells(state.board).length,
    avgEmptyCellsBeforeTurn: state.moves ? emptyCellsBeforeTurns / state.moves : 0,
    avgLegalMovesBeforeTurn: state.moves ? legalMovesBeforeTurns / state.moves : 0,
    gameOver: !hasAnyLegalMove(state.board),
  };
}

function quantile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)));
  return sorted[index];
}

function summarize(results) {
  const grouped = new Map();
  for (const result of results) {
    if (!grouped.has(result.strategy)) grouped.set(result.strategy, []);
    grouped.get(result.strategy).push(result);
  }
  const summary = [];
  for (const [strategy, rows] of grouped) {
    const scores = rows.map((row) => row.score);
    const moves = rows.map((row) => row.moves);
    const gameOvers = rows.filter((row) => row.gameOver).length;
    summary.push({
      strategy,
      games: rows.length,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      medianScore: quantile(scores, 0.5),
      p75Score: quantile(scores, 0.75),
      p90Score: quantile(scores, 0.9),
      maxScore: Math.max(...scores),
      avgMoves: moves.reduce((a, b) => a + b, 0) / moves.length,
      medianMoves: quantile(moves, 0.5),
      avgEmptyCellsBeforeTurn: rows.reduce((a, b) => a + b.avgEmptyCellsBeforeTurn, 0) / rows.length,
      avgLegalMovesBeforeTurn: rows.reduce((a, b) => a + b.avgLegalMovesBeforeTurn, 0) / rows.length,
      gameOverRate: gameOvers / rows.length,
    });
  }
  return summary.sort((a, b) => b.avgScore - a.avgScore);
}

function main() {
  const games = Number(process.argv[2] ?? 80);
  const strategies = Object.keys(STRATEGIES);
  const results = [];
  for (const strategy of strategies) {
    for (let i = 0; i < games; i += 1) {
      results.push(simulateGame(strategy, 1000003 + i * 9973));
    }
  }
  const summary = summarize(results);
  console.log(JSON.stringify({ gamesPerStrategy: games, summary, results }, null, 2));
}

main();
