# GitHub Synchronization Policy

Future changes to the Color Lines project should be synchronized with the private GitHub repository `alexvshiyan/AVS_ColorLines` when it is useful and appropriate.

| Situation | GitHub Action |
|---|---|
| A feature or bug fix is complete and validated | Commit and push to `main`. |
| TypeScript and production build checks pass after meaningful changes | Commit and push the stable state. |
| The user asks for a preview, delivery, or stable milestone | Save the web project checkpoint and push the matching code to GitHub. |
| Work is experimental, incomplete, or being debugged | Keep changes local until stable, unless the user asks otherwise. |
| A risky or larger change is about to start | Check current Git status first and preserve a stable point before proceeding. |

Current repository target: `https://github.com/alexvshiyan/AVS_ColorLines`.

## Pending Interaction Update

- [x] Allow selecting the next ball while the previous ball is still moving, so the newly selected ball starts its selected bounce animation immediately.
- [x] Keep target-cell placement disabled while any ball is currently moving; the preselected ball can only be moved after the current movement completes.
- [x] Validate the interaction with TypeScript and production build checks, then checkpoint and sync to GitHub.

## Global Leaderboard Update

- [x] Upgrade the project from static-only frontend to backend/database support so records can be shared globally.
- [x] Create a persistent leaderboard data model with player name, score, move count, and created timestamp.
- [x] Add safe API routes for reading top records and submitting a new record with basic validation and name sanitization.
- [x] Add an in-game UI that asks for the player name when a new score is eligible and saves it to the global leaderboard.
- [x] Display the global leaderboard in the arcade cabinet panel with loading, empty, success, and error states.
- [x] Validate database migration, TypeScript, production build, checkpoint the result, and sync meaningful changes to GitHub.

## Game Over and Record Saving Refinement

- [x] Show an explicit official Game Over state/message when no legal moves or empty cells remain.
- [x] Allow saving a leaderboard record only after the game has ended.
- [x] Remember the first entered player name locally on this computer while still allowing the player to edit it.
- [x] Validate the refinements with tests, TypeScript, production build, checkpoint, and GitHub sync.

## Selected Ball Waiting Sound Refinement

- [x] Synchronize the selected-ball waiting sound with the slow bounce rhythm of the selected marble.
- [x] Save a checkpoint for the sound refinement and sync it to GitHub after the successful checks.

## Optimal Play Strategy Analysis

- [x] Extract the current Color Lines rules and scoring parameters from the implementation.
- [x] Build a reproducible simulation harness for comparing candidate play strategies.
- [x] Run experiments across multiple strategy variants and summarize expected score, survival, and board-control metrics.
- [x] Recommend a practical optimal play mode or heuristic for the player and possible in-game guidance improvements.
- [x] Add and summarize an explicit board-control metric across strategies in the strategy analysis report.

## Demo and Suggest Move Algorithm Controls

- [x] Add a Suggest Move button that computes the line_builder recommendation for the current board and highlights the source cell, target cell, and path.
- [x] Add a Demo button that automatically plays recommended moves using the algorithm at a readable pace.
- [x] Allow the player to stop Demo mode at any time and continue the same game manually without resetting the board.
- [x] Ensure manual moves clear any stale suggestion highlight and Demo stops safely on game over or when no legal recommendation exists.
- [x] Add or update Vitest coverage for the move recommendation algorithm and validate with tests, TypeScript, and production build.
- [x] Stop Demo mode explicitly when the game reaches Game Over inside automatic or manual move resolution.

## Fit-to-Screen Working Area Refinement

- [x] Make the game working area fit common laptop viewport heights so the board, score, incoming balls, and main controls are visible without excessive vertical scrolling.
- [x] Preserve readability and the existing arcade visual style while reducing oversized spacing, panel heights, and top hero footprint on wide screens.
- [x] Validate the responsive layout with TypeScript/build checks and a project checkpoint.

## Leaderboard Top Records Metadata Update

- [x] Limit the global records/history display and backend query to the top 5 records.
- [x] Show each record's saved date and time in the Global Records panel.
- [x] Add a player-provided location field to score submission and display it for each leaderboard record, with a safe fallback for older records.
- [x] Update leaderboard tests for top-5 limiting, timestamp visibility data, and location validation/fallback behavior.
- [x] Validate with tests, TypeScript, production build, preview status, checkpoint, and report the result.

## Right Panel Overlap and Leaderboard Cleanup Fix

- [x] Fix the responsive cabinet layout so the right side panel never overlaps the score/save/game working areas at common desktop widths and browser zoom levels.
- [x] Make all 5 top global records fit inside the visible Global Records panel without an internal scrollbar.
- [x] Clear the existing global leaderboard records table as requested.
- [x] Validate the layout/database changes with tests, TypeScript, production build, preview status, checkpoint, and report the result.

## Header Compact + Right Panel Overlap Fix (Round 2)

- [x] Reduce the hero/header area height by ~50%: remove the large title block and description paragraph from the hero zone, keep only a compact single-line badge row so the game board is visible without scrolling.
- [x] Fix the right control panel overlap: rewrite the cabinet grid so the right column has a fixed pixel width and the left area (board + score) always gets the remaining space, with no overflow or z-index stacking issues.
- [x] Validate with tests, TypeScript check, production build, and preview screenshot.

## Layout Fix: Right Panel Overlap + Top Space + Cell Size (Round 3)

- [x] Fix right panel (score/save) overlapping the game board by switching fit-layout to CSS grid with explicit columns (1fr 280px).
- [x] Remove empty top space by removing min-h-screen from fit-section and using CSS grid for fit-left.
- [x] Reduce board cell size (board-grid constrained to calc(100svh - 13.5rem)) while keeping marble size unchanged.
- [x] Validate with tests, TypeScript check, and preview screenshot.

## Auto-Location for Leaderboard

- [x] Auto-detect user location from IP on score submission (server-side, free IP geolocation API)
- [x] Remove manual Location input field from save score form
- [x] Show location in leaderboard records table after save

## Layout Fix Round 4 (from published site screenshot)

- [x] Reduce board cell size so the board is smaller and fits better on wide screens (board-grid: 44vw)
- [x] Fix marble centering inside cells (marble uses position:absolute; inset:15% — centered in square cells)
- [x] Fix middle column (score/incoming/capacity) overlapping right panel (save score/records) — 3-col CSS grid
- [x] Add build version number display in the UI footer/header so user can verify published version
- [x] Fix row 9 overflow — added overflow:hidden to board-grid

## Save Score Pop-up (Top-5 Only)

- [x] Remove the always-visible Save Score form from the control-rail right panel
- [x] Add a tRPC query to check if a given score qualifies for top-5 (score > 5th place or fewer than 5 records)
- [x] On game over, automatically check if the score qualifies for top-5
- [x] Show a pop-up dialog (arcade-styled) with player name input only when score qualifies
- [x] Pop-up should show the player's rank position (e.g. "Rank #3")
- [x] Pop-up can be dismissed without saving (player can skip)
- [x] After saving, refresh the leaderboard and close the pop-up
- [x] Validate with tests, TypeScript, production build, checkpoint

## Top-5 Fanfare Sound Effect

- [x] Add playFanfare() function using Web Audio API: rising arpeggio (4 notes) + final chord swell
- [x] Call playFanfare() when the top-5 pop-up is shown (inside the useEffect that opens it)
- [x] Validate with TypeScript check, build, checkpoint

## Right Panel Compaction (4 fixes)

- [x] Minimize height of status/message widget in right panel (reduce padding, font size)
- [x] Minimize height of each record row (remove empty space, tighter padding)
- [x] Move SUGGEST MOVE / DEMO / NEW GAME buttons to middle column (score/incoming section)
- [x] Remove BEST / LINES ≥ 5 bottom bar entirely

## Middle Column Compaction + Horizontal Buttons

- [x] Restore horizontal button layout (SUGGEST / DEMO / NEW GAME side by side, full labels)
- [x] Reduce height of Score section (smaller score font, tighter padding)
- [x] Reduce height of Incoming section (smaller marble previews, tighter padding)
- [x] Reduce height of Capacity section (tighter padding)
- [x] Reduce height of Buttons row (smaller min-height)
- [x] Validate with TypeScript, build, checkpoint

## Buttons Vertical + Compact Records

- [x] Stack SUGGEST / DEMO / NEW GAME buttons vertically (flex-col) in middle column
- [x] Show all record info (score, date, location) in compact 2-line rows, no extra gaps
- [x] Validate with build and checkpoint

## Move Status Widget to Middle Column

- [x] Remove status widget (Cabinet Armed / Move Logged) from right panel (control-rail)
- [x] Add status widget at the bottom of middle column (fit-status-rail), below action buttons
- [x] Ensure right panel now starts directly with Global Records heading
- [x] Validate with build and checkpoint

## Live Top-5 Notification During Game

- [x] Compute `isInTop5` live: compare current score against 5th-place record score
- [x] Turn score number yellow (bright amber-yellow) when `isInTop5 === true`
- [x] Show `⚡ TOP 5` badge below the score number when `isInTop5 === true`
- [x] Flash gold status message "TOP 5 TERRITORY" when score first crosses the top-5 threshold (3s then revert to normal message)
- [x] Use gold border tone for the status widget during the flash
- [x] Validate with build and checkpoint

## Marble Appearance Tuning

- [x] Reduce colored glow/shadow intensity on marbles (more subtle, less neon)
- [x] Sharpen marble edges (crisper border, more defined silhouette)
- [x] Keep the glossy highlight and 3D shape intact
- [x] Validate with build and checkpoint

## PWA (Progressive Web App) Support

- [x] Generate app icons (192x192 and 512x512 PNG) from the game's visual identity
- [x] Create `client/public/manifest.json` with name, icons, theme color, display mode
- [x] Create `client/public/sw.js` service worker for offline caching of game assets
- [x] Add PWA meta tags to `client/index.html`: theme-color, apple-mobile-web-app-capable, apple-touch-icon
- [x] Register service worker in `client/src/main.tsx`
- [x] Validate with build, checkpoint

## Install App Banner

- [x] Create `InstallBanner` component: handles Android `beforeinstallprompt` and iOS manual instructions
- [x] On Android/Chrome: show "📲 Install App" button that triggers native install prompt
- [x] On iOS/Safari: show "📲 Install: tap Share → Add to Home Screen" instructions
- [x] Hide banner if already running as standalone PWA (window.matchMedia standalone)
- [x] Allow user to dismiss the banner (persisted in localStorage)
- [x] Place banner in the game header area (compact, non-intrusive)
- [x] Validate with build and checkpoint

## iOS Splash Screen + Install Banner Relocation

- [x] Generate iOS splash screen image (2048×2732px, dark arcade style matching game theme)
- [x] Upload splash screen to static assets and add `<link rel="apple-touch-startup-image">` to `client/index.html`
- [x] Add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` to index.html (was already present)
- [x] Move InstallBanner from above fit-layout to the bottom of the middle column (fit-status-rail), below the status widget
- [x] Validate with build, checkpoint, and GitHub push

## Mobile Audio Fix

- [x] Add a shared AudioContext singleton that is created and resumed on the first user gesture (existing code handles this; audio confirmed working on mobile)
- [x] Show a compact "🔊 Tap to enable sound" overlay on mobile devices — NOT NEEDED, audio works without overlay
- [x] Ensure the overlay tap itself unlocks the AudioContext — NOT NEEDED
- [x] Hide the overlay automatically if the user is on desktop — NOT NEEDED
- [x] Validate with build, checkpoint, and GitHub push (commit 7a02b16)

## Sound Toggle

- [x] Add `soundEnabled` state initialised from localStorage key `colorlines-sound`
- [x] Gate all `playBounceSound` and `playFanfare` calls behind `soundEnabled`
- [x] Add compact sound toggle button (🔊/🔇) at the bottom of the middle column (fit-status-rail), below InstallBanner
- [x] Persist toggle state to localStorage on change
- [x] Validate with build, checkpoint, and GitHub push

## Haptic Feedback (Vibration)

- [x] Add `vibrate(pattern)` helper that calls `navigator.vibrate` only when supported and sound is not the only feedback channel
- [x] Short pulse (30ms) on each marble move (hop step)
- [x] Double pulse [50, 30, 80] on line clear
- [x] Single short buzz (15ms) on blocked move
- [x] Validate with build, checkpoint, and GitHub push

## UI Improvements (3 tasks)

- [x] Remove "Grid Matrix" label from board header, keep only "9 × 9 TACTICAL FIELD"
- [x] Remove small subtitle text before "Color Lines" in the top header, keep only "CLASSIC COLOR LINES"
- [x] Add Undo button: 3 uses per game, shown as 3 token/star icons that deplete on use
- [x] Undo restores the board state from before the last move (board + nextBalls)
- [x] Undo button disabled when no uses remain or no moves made yet
- [x] Increase button text font size for better readability (keep button size/layout)
- [x] Add slightly rounded corners (border-radius) to all game action buttons
- [x] Validate with build, checkpoint, and GitHub push
