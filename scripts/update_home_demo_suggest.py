from pathlib import Path

path = Path('/home/ubuntu/colorlines-game/client/src/pages/Home.tsx')
text = path.read_text()

text = text.replace(
    'import { RotateCcw, Sparkles, Trophy, Zap } from "lucide-react";\n',
    'import { Bot, Pause, RotateCcw, Sparkles, Target, Trophy, Zap } from "lucide-react";\n',
)
text = text.replace(
    'import { hasAnyLegalMove } from "@/lib/colorLinesRules";\n',
    'import { hasAnyLegalMove, recommendColorLinesMove, type ColorLinesMoveRecommendation } from "@/lib/colorLinesRules";\n',
)
text = text.replace(
    '  const [pathPreview, setPathPreview] = useState<Position[]>([]);\n  const [clearingCells, setClearingCells] = useState<Position[]>([]);\n  const [movingBall, setMovingBall] = useState<MovingBall>(null);\n',
    '  const [pathPreview, setPathPreview] = useState<Position[]>([]);\n  const [suggestedMove, setSuggestedMove] = useState<ColorLinesMoveRecommendation | null>(null);\n  const [isDemoRunning, setIsDemoRunning] = useState(false);\n  const [clearingCells, setClearingCells] = useState<Position[]>([]);\n  const [movingBall, setMovingBall] = useState<MovingBall>(null);\n',
)
text = text.replace(
    '  const movementTimerRef = useRef<number | null>(null);\n  const readyBounceTimerRef = useRef<number | null>(null);\n',
    '  const movementTimerRef = useRef<number | null>(null);\n  const readyBounceTimerRef = useRef<number | null>(null);\n  const demoTimerRef = useRef<number | null>(null);\n',
)
text = text.replace(
    '      if (movementTimerRef.current) window.clearTimeout(movementTimerRef.current);\n      if (readyBounceTimerRef.current) window.clearInterval(readyBounceTimerRef.current);\n',
    '      if (movementTimerRef.current) window.clearTimeout(movementTimerRef.current);\n      if (readyBounceTimerRef.current) window.clearInterval(readyBounceTimerRef.current);\n      if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);\n',
    1,
)
text = text.replace(
    '    setPathPreview([]);\n    setClearingCells([]);\n    setMovingBall(null);\n',
    '    setPathPreview([]);\n    setSuggestedMove(null);\n    setIsDemoRunning(false);\n    if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);\n    setClearingCells([]);\n    setMovingBall(null);\n',
    1,
)

old_move = '''  const moveSelectedBall = useCallback(\n    (destination: Position) => {\n      if (!selected || gameOver || movingBall) return;\n      const color = board[selected.row][selected.col];\n      if (!color || board[destination.row][destination.col]) return;\n\n      const path = findPath(board, selected, destination);\n      if (!path.length) {\n        setPathPreview([]);\n        playBounceSound("blocked");\n        setMessage({\n          tone: "blocked",\n          title: "Path blocked",\n          body: "That marble cannot reach the selected cell. Try a route with open orthogonal steps.",\n        });\n        return;\n      }\n\n      const boardWithoutSource = cloneBoard(board);\n      boardWithoutSource[selected.row][selected.col] = null;\n      setSelected(null);\n      setPathPreview(path);\n      setMoves((value) => value + 1);\n      setBoard(boardWithoutSource);\n      setMovingBall({ color, path, step: 0 });\n      playBounceSound("hop");\n\n      let step = 0;\n      const animateStep = () => {\n        step += 1;\n        if (step < path.length) {\n          setMovingBall({ color, path, step });\n          playBounceSound("hop");\n          movementTimerRef.current = window.setTimeout(animateStep, MOVE_HOP_MS);\n          return;\n        }\n\n        const movedBoard = cloneBoard(boardWithoutSource);\n        movedBoard[destination.row][destination.col] = color;\n        setMovingBall(null);\n        setPathPreview([]);\n        setBoard(movedBoard);\n        resolveClears(movedBoard, true);\n      };\n\n      movementTimerRef.current = window.setTimeout(animateStep, MOVE_HOP_MS);\n    },\n    [board, gameOver, movingBall, playBounceSound, resolveClears, selected],\n  );\n'''
new_move = '''  const executeMove = useCallback(\n    (source: Position, destination: Position) => {\n      if (gameOver || movingBall) return false;\n      const color = board[source.row][source.col];\n      if (!color || board[destination.row][destination.col]) return false;\n\n      const path = findPath(board, source, destination);\n      if (!path.length) {\n        setPathPreview([]);\n        playBounceSound("blocked");\n        setMessage({\n          tone: "blocked",\n          title: "Path blocked",\n          body: "That marble cannot reach the selected cell. Try a route with open orthogonal steps.",\n        });\n        return false;\n      }\n\n      const boardWithoutSource = cloneBoard(board);\n      boardWithoutSource[source.row][source.col] = null;\n      setSelected(null);\n      setSuggestedMove(null);\n      setPathPreview(path);\n      setMoves((value) => value + 1);\n      setBoard(boardWithoutSource);\n      setMovingBall({ color, path, step: 0 });\n      playBounceSound("hop");\n\n      let step = 0;\n      const animateStep = () => {\n        step += 1;\n        if (step < path.length) {\n          setMovingBall({ color, path, step });\n          playBounceSound("hop");\n          movementTimerRef.current = window.setTimeout(animateStep, MOVE_HOP_MS);\n          return;\n        }\n\n        const movedBoard = cloneBoard(boardWithoutSource);\n        movedBoard[destination.row][destination.col] = color;\n        setMovingBall(null);\n        setPathPreview([]);\n        setBoard(movedBoard);\n        resolveClears(movedBoard, true);\n      };\n\n      movementTimerRef.current = window.setTimeout(animateStep, MOVE_HOP_MS);\n      return true;\n    },\n    [board, gameOver, movingBall, playBounceSound, resolveClears],\n  );\n\n  const moveSelectedBall = useCallback(\n    (destination: Position) => {\n      if (!selected) return;\n      executeMove(selected, destination);\n    },\n    [executeMove, selected],\n  );\n\n  const handleSuggestMove = useCallback(() => {\n    if (gameOver || movingBall || clearingCells.length) return;\n    const recommendation = recommendColorLinesMove(board);\n    if (!recommendation) {\n      setSuggestedMove(null);\n      setPathPreview([]);\n      playBounceSound("blocked");\n      setMessage({\n        tone: "blocked",\n        title: "No move found",\n        body: "The line-builder scanner cannot find a legal move from the current board.",\n      });\n      return;\n    }\n\n    setIsDemoRunning(false);\n    if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);\n    setSelected(recommendation.from);\n    setSuggestedMove(recommendation);\n    setPathPreview(recommendation.path);\n    setMessage({\n      tone: recommendation.clearedCount ? "clear" : "ready",\n      title: recommendation.clearedCount ? "Suggested clearing move" : "Suggested line-builder move",\n      body: `${COLOR_LABELS[recommendation.color as ColorId]} ${String.fromCharCode(65 + recommendation.from.col)}${recommendation.from.row + 1} → ${String.fromCharCode(65 + recommendation.to.col)}${recommendation.to.row + 1}. This favors future five-in-line potential and open board control.`,\n    });\n  }, [board, clearingCells.length, gameOver, movingBall, playBounceSound]);\n\n  const handleToggleDemo = useCallback(() => {\n    if (isDemoRunning) {\n      setIsDemoRunning(false);\n      if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);\n      setMessage({\n        tone: "ready",\n        title: "Demo paused",\n        body: "Algorithmic play is stopped. You can continue manually from this exact board state.",\n      });\n      return;\n    }\n\n    if (gameOver) return;\n    setIsDemoRunning(true);\n    setSelected(null);\n    setPathPreview([]);\n    setSuggestedMove(null);\n    setMessage({\n      tone: "move",\n      title: "Demo running",\n      body: "The line-builder algorithm will choose and play moves automatically. Press Stop Demo whenever you want to continue manually.",\n    });\n  }, [gameOver, isDemoRunning]);\n\n  useEffect(() => {\n    if (demoTimerRef.current) {\n      window.clearTimeout(demoTimerRef.current);\n      demoTimerRef.current = null;\n    }\n\n    if (!isDemoRunning || gameOver || movingBall || clearingCells.length) return;\n\n    demoTimerRef.current = window.setTimeout(() => {\n      const recommendation = recommendColorLinesMove(board);\n      if (!recommendation) {\n        setIsDemoRunning(false);\n        setSuggestedMove(null);\n        setPathPreview([]);\n        setMessage({\n          tone: "over",\n          title: "Demo stopped",\n          body: "The algorithm found no legal continuation from the current board.",\n        });\n        return;\n      }\n\n      setSuggestedMove(recommendation);\n      setPathPreview(recommendation.path);\n      setSelected(recommendation.from);\n      setMessage({\n        tone: recommendation.clearedCount ? "clear" : "move",\n        title: "Demo move selected",\n        body: `${COLOR_LABELS[recommendation.color as ColorId]} ${String.fromCharCode(65 + recommendation.from.col)}${recommendation.from.row + 1} → ${String.fromCharCode(65 + recommendation.to.col)}${recommendation.to.row + 1}.`,\n      });\n      executeMove(recommendation.from, recommendation.to);\n    }, 700);\n\n    return () => {\n      if (demoTimerRef.current) {\n        window.clearTimeout(demoTimerRef.current);\n        demoTimerRef.current = null;\n      }\n    };\n  }, [board, clearingCells.length, executeMove, gameOver, isDemoRunning, movingBall]);\n'''
if old_move not in text:
    raise SystemExit('moveSelectedBall block not found')
text = text.replace(old_move, new_move)

text = text.replace(
    '    if (gameOver || clearingCells.length) return;\n',
    '    if (isDemoRunning) {\n      setIsDemoRunning(false);\n      if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);\n    }\n    if (gameOver || clearingCells.length) return;\n',
    1,
)
text = text.replace(
    '      setSelected({ row, col });\n      setPathPreview([]);\n',
    '      setSelected({ row, col });\n      setSuggestedMove(null);\n      setPathPreview([]);\n',
    1,
)
text = text.replace(
    '      moveSelectedBall({ row, col });\n',
    '      setSuggestedMove(null);\n      moveSelectedBall({ row, col });\n',
    1,
)

text = text.replace(
    '                      const isClearing = hasClearedCell(clearingCells, row, col);\n',
    '                      const isClearing = hasClearedCell(clearingCells, row, col);\n                      const isSuggestedFrom = Boolean(suggestedMove && suggestedMove.from.row === row && suggestedMove.from.col === col);\n                      const isSuggestedTo = Boolean(suggestedMove && suggestedMove.to.row === row && suggestedMove.to.col === col);\n',
)
text = text.replace(
    '                          className={`board-cell ${selectedCell ? "cell-selected" : ""} ${inPath ? "cell-path" : ""} ${isClearing ? "cell-clearing" : ""} ${movingHere ? "cell-moving" : ""}`}\n',
    '                          className={`board-cell ${selectedCell ? "cell-selected" : ""} ${inPath ? "cell-path" : ""} ${isSuggestedFrom ? "cell-suggest-source" : ""} ${isSuggestedTo ? "cell-suggest-target" : ""} ${isClearing ? "cell-clearing" : ""} ${movingHere ? "cell-moving" : ""}`}\n',
)

old_buttons = '''            <div className="grid gap-3">\n              <button type="button" onClick={resetGame} className="cabinet-button group">\n                <RotateCcw size={18} className="transition-transform group-hover:-rotate-45" />\n                New Game\n              </button>\n              <div className="grid grid-cols-2 gap-3">\n                <div className="mini-stat"><Trophy size={16} /> Best {bestScore}</div>\n                <div className="mini-stat"><Sparkles size={16} /> Lines ≥ {LINE_LENGTH}</div>\n              </div>\n            </div>\n'''
new_buttons = '''            <div className="grid gap-3">\n              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">\n                <button\n                  type="button"\n                  onClick={handleSuggestMove}\n                  className="cabinet-button cabinet-button-cyan group"\n                  disabled={gameOver || Boolean(movingBall) || Boolean(clearingCells.length)}\n                >\n                  <Target size={18} className="transition-transform group-hover:scale-110" />\n                  Suggest Move\n                </button>\n                <button\n                  type="button"\n                  onClick={handleToggleDemo}\n                  className={`cabinet-button group ${isDemoRunning ? "cabinet-button-stop" : ""}`}\n                  disabled={gameOver && !isDemoRunning}\n                >\n                  {isDemoRunning ? <Pause size={18} /> : <Bot size={18} className="transition-transform group-hover:rotate-6" />}\n                  {isDemoRunning ? "Stop Demo" : "Demo"}\n                </button>\n              </div>\n              <button type="button" onClick={resetGame} className="cabinet-button group">\n                <RotateCcw size={18} className="transition-transform group-hover:-rotate-45" />\n                New Game\n              </button>\n              <div className="grid grid-cols-2 gap-3">\n                <div className="mini-stat"><Trophy size={16} /> Best {bestScore}</div>\n                <div className="mini-stat"><Sparkles size={16} /> Lines ≥ {LINE_LENGTH}</div>\n              </div>\n            </div>\n'''
if old_buttons not in text:
    raise SystemExit('button block not found')
text = text.replace(old_buttons, new_buttons)

path.write_text(text)
