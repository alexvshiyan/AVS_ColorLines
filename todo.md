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
