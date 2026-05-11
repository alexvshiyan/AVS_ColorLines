/*
Design philosophy reminder: Neo-Brutalist Arcade Modernism.
This file should reinforce a dark arcade-cockpit game surface, chamfered slab panels,
glossy marbles, hard offset shadows, compact arcade labels, and crisp mechanical feedback.
When in doubt, ask: does this choice reinforce or dilute our design philosophy?
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles, Trophy, Zap } from "lucide-react";

const BOARD_SIZE = 9;
const STARTING_BALLS = 5;
const NEXT_BALLS = 3;
const LINE_LENGTH = 5;
const MOVE_HOP_MS = 135;
const READY_BOUNCE_MS = 820;

const HERO_ASSET =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032317964/gyEVyyMtKSRsneZFu6czsm/colorlines-hero-cockpit-4iTPRioxXeKNiaReAzQapt.webp";
const STRIP_ASSET =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032317964/gyEVyyMtKSRsneZFu6czsm/colorlines-marble-strip-GfCQbyTXNUFTCb2ddsANcZ.webp";
const PANEL_ASSET =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032317964/gyEVyyMtKSRsneZFu6czsm/colorlines-panel-texture-Bgi5NKeRsdDHampfE5Wj9n.webp";

type ColorId = "red" | "cyan" | "yellow" | "green" | "magenta" | "blue" | "orange";
type Cell = ColorId | null;
type Position = { row: number; col: number };
type MessageTone = "ready" | "move" | "clear" | "blocked" | "over";

type GameMessage = {
  tone: MessageTone;
  title: string;
  body: string;
};

type MovingBall = {
  color: ColorId;
  path: Position[];
  step: number;
} | null;

const COLORS: ColorId[] = ["red", "cyan", "yellow", "green", "magenta", "blue", "orange"];

const COLOR_LABELS: Record<ColorId, string> = {
  red: "Red",
  cyan: "Cyan",
  yellow: "Gold",
  green: "Green",
  magenta: "Magenta",
  blue: "Blue",
  orange: "Orange",
};

const DIRECTIONS: Position[] = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
];

function makeEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null));
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => [...row]);
}

function samePosition(a: Position | null, b: Position | null) {
  return Boolean(a && b && a.row === b.row && a.col === b.col);
}

function inBounds(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function randomColor(): ColorId {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomNextBalls() {
  return Array.from({ length: NEXT_BALLS }, randomColor);
}

function getEmptyCells(board: Cell[][]): Position[] {
  const cells: Position[] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!board[row][col]) cells.push({ row, col });
    }
  }
  return cells;
}

function placeRandomBalls(board: Cell[][], colors: ColorId[]) {
  const nextBoard = cloneBoard(board);
  const empties = getEmptyCells(nextBoard);

  colors.forEach((color) => {
    if (!empties.length) return;
    const index = Math.floor(Math.random() * empties.length);
    const [cell] = empties.splice(index, 1);
    nextBoard[cell.row][cell.col] = color;
  });

  return nextBoard;
}

function findPath(board: Cell[][], start: Position, end: Position): Position[] {
  if (!inBounds(end.row, end.col) || board[end.row][end.col]) return [];

  const queue: Position[] = [start];
  const visited = Array.from({ length: BOARD_SIZE }, () => Array<boolean>(BOARD_SIZE).fill(false));
  const previous = Array.from({ length: BOARD_SIZE }, () => Array<Position | null>(BOARD_SIZE).fill(null));
  visited[start.row][start.col] = true;

  const steps = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  while (queue.length) {
    const current = queue.shift()!;
    if (current.row === end.row && current.col === end.col) {
      const path: Position[] = [];
      let cursor: Position | null = current;
      while (cursor) {
        path.unshift(cursor);
        cursor = previous[cursor.row][cursor.col];
      }
      return path;
    }

    for (const step of steps) {
      const row = current.row + step.row;
      const col = current.col + step.col;
      if (!inBounds(row, col) || visited[row][col]) continue;
      if (board[row][col] && !(row === end.row && col === end.col)) continue;
      visited[row][col] = true;
      previous[row][col] = current;
      queue.push({ row, col });
    }
  }

  return [];
}

function keyOf(position: Position) {
  return `${position.row}-${position.col}`;
}

function detectLines(board: Cell[][]): Position[] {
  const cleared = new Set<string>();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const color = board[row][col];
      if (!color) continue;

      DIRECTIONS.forEach((direction) => {
        const beforeRow = row - direction.row;
        const beforeCol = col - direction.col;
        if (inBounds(beforeRow, beforeCol) && board[beforeRow][beforeCol] === color) return;

        const run: Position[] = [];
        let currentRow = row;
        let currentCol = col;
        while (inBounds(currentRow, currentCol) && board[currentRow][currentCol] === color) {
          run.push({ row: currentRow, col: currentCol });
          currentRow += direction.row;
          currentCol += direction.col;
        }

        if (run.length >= LINE_LENGTH) {
          run.forEach((position) => cleared.add(keyOf(position)));
        }
      });
    }
  }

  return Array.from(cleared).map((key) => {
    const [row, col] = key.split("-").map(Number);
    return { row, col };
  });
}

function removeCells(board: Cell[][], cells: Position[]) {
  const nextBoard = cloneBoard(board);
  cells.forEach(({ row, col }) => {
    nextBoard[row][col] = null;
  });
  return nextBoard;
}

function buildInitialState() {
  const board = placeRandomBalls(makeEmptyBoard(), Array.from({ length: STARTING_BALLS }, randomColor));
  return {
    board,
    nextBalls: randomNextBalls(),
  };
}

function scoreForCleared(count: number) {
  if (count <= 0) return 0;
  return count * 2 + Math.max(0, count - LINE_LENGTH) * 3;
}

function hasClearedCell(cells: Position[], row: number, col: number) {
  return cells.some((cell) => cell.row === row && cell.col === col);
}

export default function Home() {
  const initial = useMemo(() => buildInitialState(), []);
  const [board, setBoard] = useState<Cell[][]>(initial.board);
  const [nextBalls, setNextBalls] = useState<ColorId[]>(initial.nextBalls);
  const [selected, setSelected] = useState<Position | null>(null);
  const [pathPreview, setPathPreview] = useState<Position[]>([]);
  const [clearingCells, setClearingCells] = useState<Position[]>([]);
  const [movingBall, setMovingBall] = useState<MovingBall>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const movementTimerRef = useRef<number | null>(null);
  const readyBounceTimerRef = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState<GameMessage>({
    tone: "ready",
    title: "Cabinet armed",
    body: "Select a marble, then choose an empty cell with a clear path. Align five or more to clear the line.",
  });

  useEffect(() => {
    const stored = window.localStorage.getItem("colorlines-best-score");
    if (stored) setBestScore(Number(stored));

    return () => {
      if (movementTimerRef.current) window.clearTimeout(movementTimerRef.current);
      if (readyBounceTimerRef.current) window.clearInterval(readyBounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      window.localStorage.setItem("colorlines-best-score", String(score));
    }
  }, [score, bestScore]);

  useEffect(() => {
    if (!selected || board[selected.row][selected.col]) return;
    setSelected(null);
    setPathPreview([]);
  }, [board, selected]);

  const occupiedCells = useMemo(() => BOARD_SIZE * BOARD_SIZE - getEmptyCells(board).length, [board]);
  const fillPercent = Math.round((occupiedCells / (BOARD_SIZE * BOARD_SIZE)) * 100);

  const playBounceSound = useCallback((variant: "ready" | "hop" | "blocked" = "hop") => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const baseFrequency = variant === "ready" ? 205 : variant === "blocked" ? 150 : 278;
    const peakFrequency = variant === "ready" ? 275 : variant === "blocked" ? 100 : 455;
    const duration = variant === "ready" ? 0.18 : variant === "blocked" ? 0.14 : 0.105;

    oscillator.type = variant === "blocked" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(baseFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(peakFrequency, now + duration * 0.36);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, baseFrequency * 0.72), now + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(variant === "ready" ? 850 : variant === "blocked" ? 600 : 1450, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(variant === "ready" ? 0.035 : 0.065, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }, []);

  useEffect(() => {
    if (readyBounceTimerRef.current) {
      window.clearInterval(readyBounceTimerRef.current);
      readyBounceTimerRef.current = null;
    }

    if (!selected || movingBall || gameOver || clearingCells.length) return;

    playBounceSound("ready");
    readyBounceTimerRef.current = window.setInterval(() => playBounceSound("ready"), READY_BOUNCE_MS);

    return () => {
      if (readyBounceTimerRef.current) {
        window.clearInterval(readyBounceTimerRef.current);
        readyBounceTimerRef.current = null;
      }
    };
  }, [clearingCells.length, gameOver, movingBall, playBounceSound, selected]);

  const resetGame = useCallback(() => {
    if (movementTimerRef.current) window.clearTimeout(movementTimerRef.current);
    if (readyBounceTimerRef.current) window.clearInterval(readyBounceTimerRef.current);
    const fresh = buildInitialState();
    setBoard(fresh.board);
    setNextBalls(fresh.nextBalls);
    setSelected(null);
    setPathPreview([]);
    setClearingCells([]);
    setMovingBall(null);
    setScore(0);
    setMoves(0);
    setGameOver(false);
    setMessage({
      tone: "ready",
      title: "New board online",
      body: "The line scanner is ready. Build a row, column, or diagonal chain of five matching marbles.",
    });
  }, []);

  const resolveClears = useCallback(
    (incomingBoard: Cell[][], afterMove: boolean) => {
      const cleared = detectLines(incomingBoard);
      if (cleared.length) {
        const gained = scoreForCleared(cleared.length);
        setClearingCells(cleared);
        window.setTimeout(() => {
          const clearedBoard = removeCells(incomingBoard, cleared);
          setBoard(clearedBoard);
          setClearingCells([]);
          setScore((value) => value + gained);
          setMessage({
            tone: "clear",
            title: `${cleared.length} marbles cleared`,
            body: `Line collapse registered. Score increased by ${gained}. Keep the cockpit open.`,
          });
        }, 220);
        return;
      }

      if (afterMove) {
        const withNewBalls = placeRandomBalls(incomingBoard, nextBalls);
        const postSpawnClears = detectLines(withNewBalls);
        const freshNext = randomNextBalls();
        if (postSpawnClears.length) {
          const gained = scoreForCleared(postSpawnClears.length);
          setBoard(withNewBalls);
          setClearingCells(postSpawnClears);
          window.setTimeout(() => {
            const clearedBoard = removeCells(withNewBalls, postSpawnClears);
            setBoard(clearedBoard);
            setClearingCells([]);
            setScore((value) => value + gained);
            setNextBalls(freshNext);
            setMessage({
              tone: "clear",
              title: "Spawn line cleared",
              body: `${postSpawnClears.length} fresh marbles formed a line and were removed for ${gained} points.`,
            });
          }, 220);
        } else {
          setBoard(withNewBalls);
          setNextBalls(freshNext);
          const remaining = getEmptyCells(withNewBalls).length;
          if (remaining === 0) {
            setGameOver(true);
            setMessage({
              tone: "over",
              title: "Board locked",
              body: "No empty cells remain. Start a new cabinet run and chase a higher score.",
            });
          } else {
            setMessage({
              tone: "move",
              title: "Move logged",
              body: `${NEXT_BALLS} new marbles entered the grid. Empty cells remaining: ${remaining}.`,
            });
          }
        }
      } else {
        setBoard(incomingBoard);
      }
    },
    [nextBalls],
  );

  const moveSelectedBall = useCallback(
    (destination: Position) => {
      if (!selected || gameOver || movingBall) return;
      const color = board[selected.row][selected.col];
      if (!color || board[destination.row][destination.col]) return;

      const path = findPath(board, selected, destination);
      if (!path.length) {
        setPathPreview([]);
        playBounceSound("blocked");
        setMessage({
          tone: "blocked",
          title: "Path blocked",
          body: "That marble cannot reach the selected cell. Try a route with open orthogonal steps.",
        });
        return;
      }

      const boardWithoutSource = cloneBoard(board);
      boardWithoutSource[selected.row][selected.col] = null;
      setSelected(null);
      setPathPreview(path);
      setMoves((value) => value + 1);
      setBoard(boardWithoutSource);
      setMovingBall({ color, path, step: 0 });
      playBounceSound("hop");

      let step = 0;
      const animateStep = () => {
        step += 1;
        if (step < path.length) {
          setMovingBall({ color, path, step });
          playBounceSound("hop");
          movementTimerRef.current = window.setTimeout(animateStep, MOVE_HOP_MS);
          return;
        }

        const movedBoard = cloneBoard(boardWithoutSource);
        movedBoard[destination.row][destination.col] = color;
        setMovingBall(null);
        setPathPreview([]);
        setBoard(movedBoard);
        resolveClears(movedBoard, true);
      };

      movementTimerRef.current = window.setTimeout(animateStep, MOVE_HOP_MS);
    },
    [board, gameOver, movingBall, playBounceSound, resolveClears, selected],
  );

  const handleCellClick = (row: number, col: number) => {
    if (gameOver || clearingCells.length) return;
    const color = board[row][col];

    if (color) {
      setSelected({ row, col });
      setPathPreview([]);
      setMessage({
        tone: "ready",
        title: `${COLOR_LABELS[color]} marble selected`,
        body: movingBall
          ? "Next marble queued. It can bounce in ready state now; choose its destination after the current hop sequence ends."
          : "Choose an empty cell connected by open corridors. The scanner will reject blocked routes.",
      });
      return;
    }

    if (movingBall) {
      setPathPreview([]);
      playBounceSound("blocked");
      setMessage({
        tone: "blocked",
        title: "Movement in progress",
        body: "You can preselect another marble while the current one moves, but destination targeting unlocks after the hop sequence ends.",
      });
      return;
    }

    if (selected) {
      moveSelectedBall({ row, col });
    } else {
      playBounceSound("blocked");
      setMessage({
        tone: "blocked",
        title: "No marble selected",
        body: "Tap a colored marble first, then tap an empty destination cell.",
      });
    }
  };

  const handleCellEnter = (row: number, col: number) => {
    if (!selected || board[row][col] || gameOver || clearingCells.length || movingBall) return;
    const path = findPath(board, selected, { row, col });
    setPathPreview(path);
  };

  const messageToneClass = {
    ready: "border-amber-300/25 text-amber-100",
    move: "border-cyan-300/25 text-cyan-100",
    clear: "border-green-300/35 text-green-100",
    blocked: "border-red-300/35 text-red-100",
    over: "border-magenta-300/35 text-magenta-100",
  }[message.tone];

  return (
    <main className="min-h-screen overflow-hidden bg-[#090909] text-stone-100">
      <section
        className="relative min-h-screen bg-cover bg-center px-4 py-5 sm:px-6 lg:px-8"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(7,7,7,.96), rgba(8,8,8,.86) 48%, rgba(8,8,8,.58)), url(${HERO_ASSET})` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,193,91,.13),transparent_28%),radial-gradient(circle_at_78%_62%,rgba(0,229,255,.11),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.13] mix-blend-screen [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col justify-between gap-5">
            <header className="grid gap-4 pt-2 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-2 inline-flex border border-amber-200/25 bg-black/50 px-3 py-1 font-['IBM_Plex_Sans'] text-[0.68rem] uppercase tracking-[0.38em] text-amber-100 shadow-[6px_6px_0_rgba(255,196,97,.12)] backdrop-blur">
                  Classic Color Lines / Browser Cabinet
                </p>
                <h1 className="font-['Bebas_Neue'] text-6xl leading-[0.86] tracking-[0.055em] text-stone-50 sm:text-7xl lg:text-8xl">
                  Color<br className="hidden sm:block" /> Lines
                </h1>
              </div>
              <div className="max-w-xl border-l-4 border-amber-300/60 bg-black/45 p-4 font-['IBM_Plex_Sans'] text-sm leading-6 text-stone-200 shadow-[10px_10px_0_rgba(0,0,0,.35)] backdrop-blur-md">
                Move one marble per turn. If the move does not clear a line, the incoming queue deploys three new marbles. Clear five or more matching marbles in a row, column, or diagonal.
              </div>
            </header>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_210px]">
              <section className="arcade-slab board-shell p-3 sm:p-4" aria-label="Color Lines game board">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="font-['IBM_Plex_Sans'] text-[0.62rem] uppercase tracking-[0.32em] text-amber-100/70">Grid Matrix</p>
                    <p className="font-['Bebas_Neue'] text-2xl tracking-[0.08em] text-stone-100">9 × 9 Tactical Field</p>
                  </div>
                  <div className="hidden h-9 items-center gap-1 border border-stone-600/60 bg-black/35 px-3 sm:flex">
                    {COLORS.map((color) => (
                      <span key={color} className={`legend-dot marble-${color}`} />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-9 gap-1.5 rounded-none border border-amber-200/20 bg-black/55 p-2 shadow-inner sm:gap-2 sm:p-3">
                  {board.map((rowCells, row) =>
                    rowCells.map((color, col) => {
                      const selectedCell = samePosition(selected, { row, col });
                      const inPath = pathPreview.some((cell) => cell.row === row && cell.col === col);
                      const isClearing = hasClearedCell(clearingCells, row, col);
                      const movingHere = Boolean(
                        movingBall && movingBall.path[movingBall.step]?.row === row && movingBall.path[movingBall.step]?.col === col,
                      );
                      const visibleColor = movingHere && movingBall ? movingBall.color : color;
                      return (
                        <button
                          key={`${row}-${col}`}
                          type="button"
                          aria-label={visibleColor ? `${COLOR_LABELS[visibleColor]} marble at row ${row + 1}, column ${col + 1}` : `Empty cell at row ${row + 1}, column ${col + 1}`}
                          className={`board-cell ${selectedCell ? "cell-selected" : ""} ${inPath ? "cell-path" : ""} ${isClearing ? "cell-clearing" : ""} ${movingHere ? "cell-moving" : ""}`}
                          onClick={() => handleCellClick(row, col)}
                          onMouseEnter={() => handleCellEnter(row, col)}
                        >
                          <span className="cell-coordinate">{String.fromCharCode(65 + col)}{row + 1}</span>
                          {visibleColor && <span className={`marble marble-${visibleColor}`} />}
                        </button>
                      );
                    }),
                  )}
                </div>
              </section>

              <aside className="grid gap-4">
                <div className="arcade-slab px-4 py-5">
                  <p className="font-['IBM_Plex_Sans'] text-[0.62rem] uppercase tracking-[0.32em] text-stone-400">Score</p>
                  <div className="font-['Bebas_Neue'] text-7xl leading-none tracking-[0.06em] text-amber-100 tabular-nums">{score}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 font-['IBM_Plex_Sans'] text-xs text-stone-300">
                    <span className="border border-stone-700/80 bg-black/35 p-2">Moves<br /><b className="font-['Bebas_Neue'] text-2xl text-stone-100">{moves}</b></span>
                    <span className="border border-stone-700/80 bg-black/35 p-2">Best<br /><b className="font-['Bebas_Neue'] text-2xl text-stone-100">{bestScore}</b></span>
                  </div>
                </div>

                <div className="arcade-slab px-4 py-5">
                  <p className="mb-3 font-['IBM_Plex_Sans'] text-[0.62rem] uppercase tracking-[0.32em] text-stone-400">Incoming</p>
                  <div className="flex items-center gap-3">
                    {nextBalls.map((color, index) => (
                      <span key={`${color}-${index}`} className={`preview-marble marble-${color}`} />
                    ))}
                  </div>
                </div>

                <div className="arcade-slab px-4 py-5">
                  <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.26em] text-stone-400">
                    <span>Capacity</span>
                    <span>{fillPercent}%</span>
                  </div>
                  <div className="h-3 border border-stone-600 bg-black/55 p-0.5">
                    <div className="h-full bg-gradient-to-r from-cyan-300 via-amber-200 to-red-500 transition-all duration-500" style={{ width: `${fillPercent}%` }} />
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <aside className="control-rail arcade-slab flex flex-col justify-between gap-5 p-4 sm:p-5">
            <div className="space-y-5">
              <div className="overflow-hidden border border-stone-700/80 bg-black/40 shadow-[8px_8px_0_rgba(0,0,0,.4)]">
                <img src={STRIP_ASSET} alt="Colored game marbles on an arcade panel" className="h-28 w-full object-cover" />
              </div>

              <div className={`border bg-black/45 p-4 shadow-[8px_8px_0_rgba(0,0,0,.35)] ${messageToneClass}`}>
                <p className="mb-1 flex items-center gap-2 font-['Bebas_Neue'] text-3xl tracking-[0.08em]"><Zap size={18} /> {message.title}</p>
                <p className="font-['IBM_Plex_Sans'] text-sm leading-6 text-stone-200">{message.body}</p>
              </div>

              <div className="rule-card" style={{ backgroundImage: `linear-gradient(rgba(7,7,7,.78), rgba(7,7,7,.9)), url(${PANEL_ASSET})` }}>
                <h2 className="mb-3 font-['Bebas_Neue'] text-4xl tracking-[0.08em] text-stone-50">Rules Scanner</h2>
                <ol className="space-y-3 font-['IBM_Plex_Sans'] text-sm leading-6 text-stone-300">
                  <li><b className="text-amber-100">01.</b> Select any marble already on the board.</li>
                  <li><b className="text-amber-100">02.</b> Move it only through empty orthogonal cells.</li>
                  <li><b className="text-amber-100">03.</b> Align five matching marbles horizontally, vertically, or diagonally.</li>
                  <li><b className="text-amber-100">04.</b> If no line clears, the incoming queue deploys.</li>
                </ol>
              </div>
            </div>

            <div className="grid gap-3">
              <button type="button" onClick={resetGame} className="cabinet-button group">
                <RotateCcw size={18} className="transition-transform group-hover:-rotate-45" />
                New Game
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="mini-stat"><Trophy size={16} /> Best {bestScore}</div>
                <div className="mini-stat"><Sparkles size={16} /> Lines ≥ {LINE_LENGTH}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
