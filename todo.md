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
