/*
Design philosophy reminder: Neo-Brutalist Arcade Modernism.
This file should reinforce a dark arcade-cockpit game surface, chamfered slab panels,
glossy marbles, hard offset shadows, compact arcade labels, and crisp mechanical feedback.
When in doubt, ask: does this choice reinforce or dilute our design philosophy?
*/

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Pause, RotateCcw, Target, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { hasAnyLegalMove, recommendColorLinesMove, type ColorLinesMoveRecommendation } from "@/lib/colorLinesRules";
import InstallBanner from "@/components/InstallBanner";

const BOARD_SIZE = 9;
const STARTING_BALLS = 5;
const NEXT_BALLS = 3;
const LINE_LENGTH = 5;
const MOVE_HOP_MS = 135;
const SELECTED_BOUNCE_HALF_MS = 650;
const READY_BOUNCE_MS = SELECTED_BOUNCE_HALF_MS * 2;
const PLAYER_NAME_STORAGE_KEY = "colorlines-player-name";

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

function formatRecordDateTime(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasClearedCell(cells: Position[], row: number, col: number) {
  return cells.some((cell) => cell.row === row && cell.col === col);
}

/** Trigger haptic feedback on devices that support the Vibration API. */
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

export default function Home() {
  const initial = useMemo(() => buildInitialState(), []);
  const [board, setBoard] = useState<Cell[][]>(initial.board);
  const [nextBalls, setNextBalls] = useState<ColorId[]>(initial.nextBalls);
  const [selected, setSelected] = useState<Position | null>(null);
  const [pathPreview, setPathPreview] = useState<Position[]>([]);
  const [suggestedMove, setSuggestedMove] = useState<ColorLinesMoveRecommendation | null>(null);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [clearingCells, setClearingCells] = useState<Position[]>([]);
  const [movingBall, setMovingBall] = useState<MovingBall>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const movementTimerRef = useRef<number | null>(null);
  const readyBounceTimerRef = useRef<number | null>(null);
  const demoTimerRef = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = window.localStorage.getItem("colorlines-sound");
    return stored === null ? true : stored === "true";
  });
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [qualifyResult, setQualifyResult] = useState<{ qualifies: boolean; rank: number; totalRecords: number } | null>(null);
  const trpcUtils = trpc.useUtils();
  const leaderboardQuery = trpc.leaderboard.list.useQuery({ limit: 5 });
  const submitScoreMutation = trpc.leaderboard.submit.useMutation({
    onSuccess: () => {
      setSubmittedScore(score);
      setShowScorePopup(false);
      void trpcUtils.leaderboard.list.invalidate();
      setMessage({
        tone: "clear",
        title: "Record transmitted",
        body: "Your score has been saved to the global leaderboard.",
      });
    },
    onError: () => {
      setMessage({
        tone: "blocked",
        title: "Record uplink failed",
        body: "The leaderboard could not save this score. Check the name and try again.",
      });
    },
  });
  // Query to check top-5 qualification — only runs when game is over and score > 0
  const qualifiesQuery = trpc.leaderboard.qualifies.useQuery(
    { score },
    { enabled: gameOver && score > 0 && submittedScore !== score },
  );
  const [message, setMessage] = useState<GameMessage>({
    tone: "ready",
    title: "Cabinet armed",
    body: "Select a marble, then choose an empty cell with a clear path. Align five or more to clear the line.",
  });

  useEffect(() => {
    const stored = window.localStorage.getItem("colorlines-best-score");
    if (stored) setBestScore(Number(stored));
    const storedPlayerName = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
    if (storedPlayerName) setPlayerName(storedPlayerName);

    return () => {
      if (movementTimerRef.current) window.clearTimeout(movementTimerRef.current);
      if (readyBounceTimerRef.current) window.clearInterval(readyBounceTimerRef.current);
      if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);
    };
  }, []);

  // Stable ref so the popup useEffect can call playFanfare without ordering constraints
  const playFanfareRef = useRef<(() => void) | null>(null);

  // Open score popup when qualification result arrives
  useEffect(() => {
    if (!qualifiesQuery.data) return;
    setQualifyResult(qualifiesQuery.data);
    if (qualifiesQuery.data.qualifies && submittedScore !== score) {
      // Small delay so the game-over message settles first, then show popup + fanfare
      const t = window.setTimeout(() => {
        setShowScorePopup(true);
        playFanfareRef.current?.();
      }, 600);
      return () => window.clearTimeout(t);
    }
  }, [qualifiesQuery.data, score, submittedScore]);

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

  useEffect(() => {
    if (gameOver || movingBall || clearingCells.length) return;
    if (hasAnyLegalMove(board)) return;

    setGameOver(true);
    setIsDemoRunning(false);
    if (demoTimerRef.current) {
      window.clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    setSelected(null);
    setPathPreview([]);
    setSuggestedMove(null);
    setMessage({
      tone: "over",
      title: "GAME OVER",
      body: "No legal move can be made from the current board. You can now save this final score.",
    });
  }, [board, clearingCells.length, gameOver, movingBall]);

  const occupiedCells = useMemo(() => BOARD_SIZE * BOARD_SIZE - getEmptyCells(board).length, [board]);
  const fillPercent = Math.round((occupiedCells / (BOARD_SIZE * BOARD_SIZE)) * 100);

  // Live top-5 detection: compare current score against the 5th-place record
  const leaderboardRecordsForTop5 = leaderboardQuery.data ?? [];
  const isInTop5 = useMemo(() => {
    if (score === 0) return false;
    const records = leaderboardRecordsForTop5;
    if (records.length < 5) return true; // fewer than 5 records — any score qualifies
    const fifthScore = records[4]?.score ?? 0;
    return score > fifthScore;
  }, [score, leaderboardRecordsForTop5]);

  // Track whether we already fired the top-5 flash this game session
  const top5FlashFiredRef = useRef(false);
  const top5FlashTimerRef = useRef<number | null>(null);

  // Fire the gold flash message once when score first enters top-5
  useEffect(() => {
    if (gameOver) return; // don't fire after game ends (popup handles that)
    if (!isInTop5) {
      top5FlashFiredRef.current = false; // reset if score drops below (e.g. new game)
      return;
    }
    if (top5FlashFiredRef.current) return; // already fired this session
    top5FlashFiredRef.current = true;

    setMessage({
      tone: "clear" as MessageTone,
      title: "⚡ TOP 5 TERRITORY",
      body: "Your score has entered the global top 5. Keep the chain alive!",
    });

    // Revert to a neutral status message after 3 seconds
    if (top5FlashTimerRef.current) window.clearTimeout(top5FlashTimerRef.current);
    top5FlashTimerRef.current = window.setTimeout(() => {
      setMessage((prev) =>
        prev.title === "⚡ TOP 5 TERRITORY"
          ? { tone: "move", title: "Top 5 active", body: "Score is in global top 5. Keep building lines." }
          : prev
      );
    }, 3000);
  }, [isInTop5, gameOver]);


  /** Play a short arcade fanfare: rising 4-note arpeggio followed by a triumphant chord swell. */
  const playFanfare = useCallback(() => {
    if (!soundEnabled) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.02);
    masterGain.gain.setValueAtTime(0.28, ctx.currentTime + 1.1);
    masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
    masterGain.connect(ctx.destination);

    // Rising arpeggio: C5 → E5 → G5 → C6, each 120ms apart
    const arpeggioNotes = [523.25, 659.25, 783.99, 1046.5];
    arpeggioNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq * 1.5;
      filter.Q.value = 1.2;

      const start = ctx.currentTime + i * 0.12;
      const end = start + 0.18;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      // Slight pitch shimmer for arcade feel
      osc.frequency.linearRampToValueAtTime(freq * 1.012, start + 0.06);
      osc.frequency.linearRampToValueAtTime(freq, end);

      noteGain.gain.setValueAtTime(0.0001, start);
      noteGain.gain.linearRampToValueAtTime(0.7, start + 0.018);
      noteGain.gain.setValueAtTime(0.7, end - 0.04);
      noteGain.gain.linearRampToValueAtTime(0.0001, end);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(masterGain);
      osc.start(start);
      osc.stop(end + 0.01);
    });

    // Final chord swell: C5 + E5 + G5 together
    const chordNotes = [523.25, 659.25, 783.99];
    const chordStart = ctx.currentTime + 0.52;
    chordNotes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, chordStart);
      noteGain.gain.setValueAtTime(0.0001, chordStart);
      noteGain.gain.linearRampToValueAtTime(0.55, chordStart + 0.06);
      noteGain.gain.setValueAtTime(0.55, chordStart + 0.55);
      noteGain.gain.linearRampToValueAtTime(0.0001, chordStart + 0.95);
      osc.connect(noteGain);
      noteGain.connect(masterGain);
      osc.start(chordStart);
      osc.stop(chordStart + 1.0);
    });

    // Bright shimmer overtone on top of chord
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(2093, chordStart); // C7
    shimmerGain.gain.setValueAtTime(0.0001, chordStart);
    shimmerGain.gain.linearRampToValueAtTime(0.18, chordStart + 0.04);
    shimmerGain.gain.linearRampToValueAtTime(0.0001, chordStart + 0.5);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(masterGain);
    shimmer.start(chordStart);
    shimmer.stop(chordStart + 0.55);
  }, [soundEnabled]);

  // Keep the ref in sync so the popup useEffect can call it without ordering issues
  playFanfareRef.current = playFanfare;

  const playBounceSound = useCallback((variant: "ready" | "hop" | "blocked" = "hop") => {
    if (!soundEnabled) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const baseFrequency = variant === "ready" ? 178 : variant === "blocked" ? 150 : 278;
    const peakFrequency = variant === "ready" ? 236 : variant === "blocked" ? 100 : 455;
    const duration = variant === "ready" ? 0.12 : variant === "blocked" ? 0.14 : 0.105;

    oscillator.type = variant === "ready" ? "triangle" : variant === "blocked" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(baseFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(peakFrequency, now + duration * 0.36);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, baseFrequency * 0.72), now + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(variant === "ready" ? 520 : variant === "blocked" ? 600 : 1450, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(variant === "ready" ? 0.022 : 0.065, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }, [soundEnabled]);

  useEffect(() => {
    if (readyBounceTimerRef.current) {
      window.clearInterval(readyBounceTimerRef.current);
      readyBounceTimerRef.current = null;
    }

    if (!selected || movingBall || gameOver || clearingCells.length) return;

    readyBounceTimerRef.current = window.setTimeout(() => {
      playBounceSound("ready");
      readyBounceTimerRef.current = window.setInterval(() => playBounceSound("ready"), READY_BOUNCE_MS);
    }, READY_BOUNCE_MS);

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
    setSuggestedMove(null);
    setIsDemoRunning(false);
    if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);
    setClearingCells([]);
    setMovingBall(null);
    setScore(0);
    setMoves(0);
    setGameOver(false);
    setSubmittedScore(null);
    setShowScorePopup(false);
    setQualifyResult(null);
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
        vibrate([50, 30, 80]);
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
          vibrate([50, 30, 80]);
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
          if (!hasAnyLegalMove(withNewBalls)) {
            setGameOver(true);
            setIsDemoRunning(false);
            if (demoTimerRef.current) {
              window.clearTimeout(demoTimerRef.current);
              demoTimerRef.current = null;
            }
            setSelected(null);
            setPathPreview([]);
            setSuggestedMove(null);
            setMessage({
              tone: "over",
              title: "GAME OVER",
              body:
                remaining === 0
                  ? "No empty cells remain, so no further move can be made. You can now save this final score."
                  : "No legal path remains for any marble. You can now save this final score.",
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

  const executeMove = useCallback(
    (source: Position, destination: Position) => {
      if (gameOver || movingBall) return false;
      const color = board[source.row][source.col];
      if (!color || board[destination.row][destination.col]) return false;

      const path = findPath(board, source, destination);
      if (!path.length) {
        setPathPreview([]);
        playBounceSound("blocked");
        vibrate(15);
        setMessage({
          tone: "blocked",
          title: "Path blocked",
          body: "That marble cannot reach the selected cell. Try a route with open orthogonal steps.",
        });
        return false;
      }

      const boardWithoutSource = cloneBoard(board);
      boardWithoutSource[source.row][source.col] = null;
      setSelected(null);
      setSuggestedMove(null);
      setPathPreview(path);
      setMoves((value) => value + 1);
      setBoard(boardWithoutSource);
      setMovingBall({ color, path, step: 0 });
      playBounceSound("hop");
      vibrate(30);

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
      return true;
    },
    [board, gameOver, movingBall, playBounceSound, resolveClears],
  );

  const moveSelectedBall = useCallback(
    (destination: Position) => {
      if (!selected) return;
      executeMove(selected, destination);
    },
    [executeMove, selected],
  );

  const handleSuggestMove = useCallback(() => {
    if (gameOver || movingBall || clearingCells.length) return;
    const recommendation = recommendColorLinesMove(board);
    if (!recommendation) {
      setSuggestedMove(null);
      setPathPreview([]);
      playBounceSound("blocked");
      setMessage({
        tone: "blocked",
        title: "No move found",
        body: "The line-builder scanner cannot find a legal move from the current board.",
      });
      return;
    }

    setIsDemoRunning(false);
    if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);
    setSelected(recommendation.from);
    setSuggestedMove(recommendation);
    setPathPreview(recommendation.path);
    setMessage({
      tone: recommendation.clearedCount ? "clear" : "ready",
      title: recommendation.clearedCount ? "Suggested clearing move" : "Suggested line-builder move",
      body: `${COLOR_LABELS[recommendation.color as ColorId]} ${String.fromCharCode(65 + recommendation.from.col)}${recommendation.from.row + 1} → ${String.fromCharCode(65 + recommendation.to.col)}${recommendation.to.row + 1}. This favors future five-in-line potential and open board control.`,
    });
  }, [board, clearingCells.length, gameOver, movingBall, playBounceSound]);

  const handleToggleDemo = useCallback(() => {
    if (isDemoRunning) {
      setIsDemoRunning(false);
      if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);
      setMessage({
        tone: "ready",
        title: "Demo paused",
        body: "Algorithmic play is stopped. You can continue manually from this exact board state.",
      });
      return;
    }

    if (gameOver) return;
    setIsDemoRunning(true);
    setSelected(null);
    setPathPreview([]);
    setSuggestedMove(null);
    setMessage({
      tone: "move",
      title: "Demo running",
      body: "The line-builder algorithm will choose and play moves automatically. Press Stop Demo whenever you want to continue manually.",
    });
  }, [gameOver, isDemoRunning]);

  useEffect(() => {
    if (demoTimerRef.current) {
      window.clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }

    if (!isDemoRunning || gameOver || movingBall || clearingCells.length) return;

    demoTimerRef.current = window.setTimeout(() => {
      const recommendation = recommendColorLinesMove(board);
      if (!recommendation) {
        setIsDemoRunning(false);
        setSuggestedMove(null);
        setPathPreview([]);
        setMessage({
          tone: "over",
          title: "Demo stopped",
          body: "The algorithm found no legal continuation from the current board.",
        });
        return;
      }

      setSuggestedMove(recommendation);
      setPathPreview(recommendation.path);
      setSelected(recommendation.from);
      setMessage({
        tone: recommendation.clearedCount ? "clear" : "move",
        title: "Demo move selected",
        body: `${COLOR_LABELS[recommendation.color as ColorId]} ${String.fromCharCode(65 + recommendation.from.col)}${recommendation.from.row + 1} → ${String.fromCharCode(65 + recommendation.to.col)}${recommendation.to.row + 1}.`,
      });
      executeMove(recommendation.from, recommendation.to);
    }, 700);

    return () => {
      if (demoTimerRef.current) {
        window.clearTimeout(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };
  }, [board, clearingCells.length, executeMove, gameOver, isDemoRunning, movingBall]);

  const handleCellClick = (row: number, col: number) => {
    if (isDemoRunning) {
      setIsDemoRunning(false);
      if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);
    }
    if (gameOver || clearingCells.length) return;
    const color = board[row][col];

    if (color) {
      setSelected({ row, col });
      setSuggestedMove(null);
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
      setSuggestedMove(null);
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

  const handlePlayerNameChange = useCallback((value: string) => {
    setPlayerName(value);
    if (value.trim()) {
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, value);
    }
  }, []);



  const handleLeaderboardSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      if (event) event.preventDefault();
      if (!gameOver || score <= 0 || submitScoreMutation.isPending || submittedScore === score) return;
      if (playerName.trim()) {
        window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
      }
      submitScoreMutation.mutate({
        playerName,
        score,
        moves,
      });
    },
    [gameOver, moves, playerName, score, submitScoreMutation, submittedScore],
  );

  const leaderboardRecords = leaderboardQuery.data ?? [];
  const canSubmitScore = gameOver && score > 0 && submittedScore !== score;

  const messageToneClass = (() => {
    // Gold override when the TOP 5 flash is active
    if (message.title === "⚡ TOP 5 TERRITORY" || (isInTop5 && !gameOver && message.title === "Top 5 active")) {
      return "border-yellow-300/60 text-yellow-100 bg-yellow-900/20";
    }
    return {
      ready: "border-amber-300/25 text-amber-100",
      move: "border-cyan-300/25 text-cyan-100",
      clear: "border-green-300/35 text-green-100",
      blocked: "border-red-300/35 text-red-100",
      over: "border-magenta-300/35 text-magenta-100",
    }[message.tone];
  })();

  return (
    <main className="min-h-screen overflow-hidden bg-[#090909] text-stone-100">
      <section
        className="fit-section relative bg-cover bg-center px-3 py-3 sm:px-4 lg:px-6"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(7,7,7,.96), rgba(8,8,8,.86) 48%, rgba(8,8,8,.58)), url(${HERO_ASSET})` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,193,91,.13),transparent_28%),radial-gradient(circle_at_78%_62%,rgba(0,229,255,.11),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.13] mix-blend-screen [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="fit-layout relative mx-auto w-full max-w-[1400px]">
            <header className="fit-header flex flex-row items-center gap-4 pt-1">
              <p className="fit-kicker inline-flex border border-amber-200/25 bg-black/50 px-3 py-1 font-['IBM_Plex_Sans'] text-[0.68rem] uppercase tracking-[0.38em] text-amber-100 shadow-[6px_6px_0_rgba(255,196,97,.12)] backdrop-blur">
                Classic Color Lines / Browser Cabinet
              </p>
              <h1 className="fit-title font-['Bebas_Neue'] text-3xl leading-none tracking-[0.055em] text-stone-50 sm:text-4xl lg:text-5xl">
                Color Lines
              </h1>
              <span className="ml-auto font-['IBM_Plex_Sans'] text-[0.58rem] text-amber-100/30 tracking-[0.12em] uppercase select-none hidden lg:block">
                build {__BUILD_VERSION__}
              </span>
            </header>

              <section className="arcade-slab board-shell fit-board-shell p-2 sm:p-3" aria-label="Color Lines game board">
                <div className="fit-board-head mb-3 flex items-center justify-between gap-3 px-1">
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

                <div className="board-grid grid grid-cols-9 rounded-none border border-amber-200/20 bg-black/55 shadow-inner">
                  {board.map((rowCells, row) =>
                    rowCells.map((color, col) => {
                      const selectedCell = samePosition(selected, { row, col });
                      const inPath = pathPreview.some((cell) => cell.row === row && cell.col === col);
                      const isClearing = hasClearedCell(clearingCells, row, col);
                      const isSuggestedFrom = Boolean(suggestedMove && suggestedMove.from.row === row && suggestedMove.from.col === col);
                      const isSuggestedTo = Boolean(suggestedMove && suggestedMove.to.row === row && suggestedMove.to.col === col);
                      const movingHere = Boolean(
                        movingBall && movingBall.path[movingBall.step]?.row === row && movingBall.path[movingBall.step]?.col === col,
                      );
                      const visibleColor = movingHere && movingBall ? movingBall.color : color;
                      return (
                        <button
                          key={`${row}-${col}`}
                          type="button"
                          aria-label={visibleColor ? `${COLOR_LABELS[visibleColor]} marble at row ${row + 1}, column ${col + 1}` : `Empty cell at row ${row + 1}, column ${col + 1}`}
                          className={`board-cell ${selectedCell ? "cell-selected" : ""} ${inPath ? "cell-path" : ""} ${isSuggestedFrom ? "cell-suggest-source" : ""} ${isSuggestedTo ? "cell-suggest-target" : ""} ${isClearing ? "cell-clearing" : ""} ${movingHere ? "cell-moving" : ""}`}
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

              <aside className="fit-status-rail grid gap-2">
                {/* Score section */}
                <div className="arcade-slab fit-side-card px-2 py-1.5">
                  <p className="font-['IBM_Plex_Sans'] text-[0.55rem] uppercase tracking-[0.28em] text-stone-400">Score</p>
                  <div className={`fit-score font-['Bebas_Neue'] leading-none tracking-[0.06em] tabular-nums transition-colors duration-500 ${isInTop5 ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]' : 'text-amber-100'}`}>{score}</div>
                  {isInTop5 && (
                    <div className="mt-0.5 flex items-center gap-1 font-['IBM_Plex_Sans'] text-[0.6rem] font-bold uppercase tracking-[0.18em] text-yellow-300 animate-pulse">
                      <Zap size={10} />
                      <span>Top 5</span>
                    </div>
                  )}
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 font-['IBM_Plex_Sans'] text-[0.6rem] text-stone-300">
                    <span className="border border-stone-700/80 bg-black/35 px-1.5 py-1">Moves<br /><b className="font-['Bebas_Neue'] text-lg text-stone-100">{moves}</b></span>
                    <span className="border border-stone-700/80 bg-black/35 px-1.5 py-1">Best<br /><b className="font-['Bebas_Neue'] text-lg text-stone-100">{bestScore}</b></span>
                  </div>
                </div>

                {/* Incoming section */}
                <div className="arcade-slab px-2 py-1.5">
                  <p className="mb-1 font-['IBM_Plex_Sans'] text-[0.55rem] uppercase tracking-[0.28em] text-stone-400">Incoming</p>
                  <div className="flex items-center gap-2">
                    {nextBalls.map((color, index) => (
                      <span key={`${color}-${index}`} className={`preview-marble marble-${color}`} />
                    ))}
                  </div>
                </div>

                {/* Capacity section */}
                <div className="arcade-slab px-2 py-1.5">
                  <div className="mb-1 flex items-center justify-between text-[0.55rem] uppercase tracking-[0.22em] text-stone-400">
                    <span>Capacity</span>
                    <span>{fillPercent}%</span>
                  </div>
                  <div className="h-2 border border-stone-600 bg-black/55 p-0.5">
                    <div className="h-full bg-gradient-to-r from-cyan-300 via-amber-200 to-red-500 transition-all duration-500" style={{ width: `${fillPercent}%` }} />
                  </div>
                </div>

                {/* Action buttons — vertical stack */}
                <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={handleSuggestMove}
                      className="cabinet-button cabinet-button-cyan group !text-[0.7rem] !min-h-[2.2rem] w-full gap-1.5"
                      disabled={gameOver || Boolean(movingBall) || Boolean(clearingCells.length)}
                    >
                      <Target size={13} className="transition-transform group-hover:scale-110 shrink-0" />
                      Suggest Move
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleDemo}
                      className={`cabinet-button group !text-[0.7rem] !min-h-[2.2rem] w-full gap-1.5 ${isDemoRunning ? "cabinet-button-stop" : ""}`}
                      disabled={gameOver && !isDemoRunning}
                    >
                      {isDemoRunning ? <Pause size={13} className="shrink-0" /> : <Bot size={13} className="transition-transform group-hover:rotate-6 shrink-0" />}
                      {isDemoRunning ? "Stop Demo" : "Demo"}
                    </button>
                    <button type="button" onClick={resetGame} className="cabinet-button group !text-[0.7rem] !min-h-[2.2rem] w-full gap-1.5">
                      <RotateCcw size={13} className="transition-transform group-hover:-rotate-45 shrink-0" />
                      New Game
                    </button>
                </div>

                {/* Status message — moved here from right panel */}
                <div className={`fit-message border bg-black/45 px-2.5 py-1.5 shadow-[6px_6px_0_rgba(0,0,0,.35)] ${messageToneClass}`}>
                  <p className="fit-message-title mb-0.5 flex items-center gap-1.5 font-['Bebas_Neue'] text-base tracking-[0.08em]"><Zap size={12} /> {message.title}</p>
                  <p className="fit-message-body font-['IBM_Plex_Sans'] text-[0.6rem] leading-[1.35] text-stone-200">{message.body}</p>
                </div>

                {/* Install App Banner — bottom of middle column */}
                <InstallBanner />

                {/* Sound toggle — very bottom of middle column */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    window.localStorage.setItem("colorlines-sound", String(next));
                  }}
                  className="flex w-full items-center justify-between border border-stone-700/60 bg-black/30 px-2.5 py-1.5 font-['IBM_Plex_Sans'] text-[0.6rem] uppercase tracking-[0.22em] text-stone-400 transition-colors hover:border-amber-400/40 hover:text-amber-200"
                  aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
                >
                  <span>{soundEnabled ? "Sound" : "Sound"}</span>
                  <span className="text-base leading-none">{soundEnabled ? "🔊" : "🔇"}</span>
                </button>

              </aside>

          {/* ── Score Qualification Pop-up ── */}
          {showScorePopup && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setShowScorePopup(false); }}
            >
              <div
                className="relative mx-4 w-full max-w-sm border border-amber-300/40 bg-[#0d0d0d] p-6 shadow-[12px_12px_0_rgba(255,196,97,.18)] outline outline-1 outline-amber-300/10"
                style={{ backgroundImage: `linear-gradient(rgba(10,10,10,.92), rgba(10,10,10,.97)), url(${PANEL_ASSET})` }}
              >
                {/* Chamfer corner decoration */}
                <div className="pointer-events-none absolute inset-[6px] border border-amber-200/10 [clip-path:polygon(0_10px,10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]" />

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-['IBM_Plex_Sans'] text-[0.6rem] uppercase tracking-[0.38em] text-amber-300/70">New Record</p>
                    <p className="font-['Bebas_Neue'] text-4xl leading-none tracking-[0.06em] text-amber-100">
                      {qualifyResult ? `Rank #${qualifyResult.rank}` : 'Top 5!'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-['IBM_Plex_Sans'] text-[0.6rem] uppercase tracking-[0.28em] text-stone-400">Score</p>
                    <p className="font-['Bebas_Neue'] text-3xl leading-none text-stone-100 tabular-nums">{score}</p>
                  </div>
                </div>

                <p className="mb-4 font-['IBM_Plex_Sans'] text-xs leading-5 text-stone-300">
                  {qualifyResult && qualifyResult.totalRecords < 5
                    ? `You're among the first ${qualifyResult.totalRecords + 1} pilots on the board. Enter your name to claim your spot.`
                    : `Your score enters the global top 5. Enter your call sign to lock in the record.`}
                </p>

                <form
                  className="grid gap-3"
                  onSubmit={(e) => { e.preventDefault(); handleLeaderboardSubmit(); }}
                >
                  <label className="grid gap-1 font-['IBM_Plex_Sans'] text-xs text-stone-300">
                    Call sign / Player name
                    <input
                      value={playerName}
                      onChange={(e) => handlePlayerNameChange(e.target.value)}
                      maxLength={24}
                      placeholder="Your name"
                      className="leaderboard-input"
                      aria-label="Player name for global leaderboard"
                      autoFocus
                    />
                  </label>
                  <button
                    type="submit"
                    className="leaderboard-save-button"
                    disabled={!playerName.trim() || submitScoreMutation.isPending}
                  >
                    {submitScoreMutation.isPending ? 'Transmitting...' : 'Confirm Record'}
                  </button>
                  <button
                    type="button"
                    className="font-['IBM_Plex_Sans'] text-[0.65rem] uppercase tracking-[0.28em] text-stone-500 hover:text-stone-300 transition-colors"
                    onClick={() => setShowScorePopup(false)}
                  >
                    Skip — don't save
                  </button>
                </form>
              </div>
            </div>
          )}

          <aside className="control-rail arcade-slab flex flex-col justify-between gap-5 p-4 sm:p-5">
            <div className="fit-rail-content space-y-5">
              <div className="rule-card" style={{ backgroundImage: `linear-gradient(rgba(7,7,7,.78), rgba(7,7,7,.9)), url(${PANEL_ASSET})` }}>
                <h2 className="fit-records-title mb-3 font-['Bebas_Neue'] text-4xl tracking-[0.08em] text-stone-50">Global Records</h2>
                {leaderboardQuery.isLoading ? (
                  <p className="font-['IBM_Plex_Sans'] text-sm leading-6 text-stone-300">Loading the leaderboard signal...</p>
                ) : leaderboardQuery.isError ? (
                  <p className="font-['IBM_Plex_Sans'] text-sm leading-6 text-red-200">Global leaderboard is temporarily unavailable.</p>
                ) : leaderboardRecords.length === 0 ? (
                  <p className="font-['IBM_Plex_Sans'] text-sm leading-6 text-stone-300">No records yet. Be the first pilot on the board.</p>
                ) : (
                  <ol className="leaderboard-list">
                    {leaderboardRecords.map((record, index) => (
                      <li key={record.id} className="leaderboard-row">
                        {/* Top line: rank + name + score */}
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="leaderboard-rank shrink-0">#{index + 1}</span>
                          <span className="leaderboard-name truncate flex-1">{record.playerName}</span>
                          <span className="leaderboard-score shrink-0">{record.score}</span>
                        </div>
                        {/* Line 2: moves · date */}
                        <div className="leaderboard-meta">
                          <span>{record.moves}mv</span>
                          <span>·</span>
                          <span>{formatRecordDateTime(record.createdAt)}</span>
                        </div>
                        {/* Line 3: location */}
                        <div className="leaderboard-meta leaderboard-location">
                          <span className="truncate">{record.location || "Unknown location"}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>


          </aside>
        </div>
      </section>
    </main>
  );
}
