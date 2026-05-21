# Color Lines Analytics Foundation Design — 2026-05-21

## Decision

The first implementation should stay inside the existing Color Lines WebDev stack rather than adding a third-party analytics product. This keeps the data model under project control, avoids external SDK weight, and makes it possible to build the requested private dashboard directly in the existing app.

| Option | Tradeoffs | Cost | Setup Complexity |
| --- | --- | --- | --- |
| Built-in first-party analytics in the existing app | Full control, privacy-friendly data minimization, dashboard can use current auth and database. Requires schema, router, frontend instrumentation, and maintenance. | Uses existing hosting/database resources. | Moderate. |
| Third-party analytics tool | Faster dashboards and richer segmentation out of the box. Adds external tracking dependency, privacy review, consent/config work, and less control over raw data. | May become paid as traffic grows. | Low to moderate initially, higher for privacy/consent and custom game events. |

## Privacy-friendly scope

The foundation will store anonymous product events. A stable anonymous session id will live in localStorage. If the player is authenticated, the backend can associate the event with the current user id, but normal gameplay will work without login. The event payload will be constrained to compact JSON metadata and will avoid names, emails, raw IP addresses, or board contents.

The backend can derive coarse operational metadata from the request and client environment: browser user agent, browser family, platform, viewport size, display mode, timezone, locale, and optionally coarse city/country using the existing IP location helper pattern. Raw IP should not be stored.

## Data model

Two tables are sufficient for the foundation and online-player indicator:

| Table | Purpose | Notes |
| --- | --- | --- |
| `analytics_events` | Immutable stream of button/toggle/game/install/share events. | Indexed by event name, session id, user id, and createdAt for dashboard queries. |
| `player_sessions` | Last-seen session heartbeat and lightweight device/location context. | Online players are sessions with `lastSeenAt` inside a short rolling window. |

## Event taxonomy

Initial tracked events should include `session_started`, `heartbeat`, `new_game_clicked`, `suggest_move_clicked`, `demo_started`, `demo_stopped`, `undo_clicked`, `sound_toggled`, `spawn_preview_toggled`, `cell_selected`, `move_completed`, `path_blocked`, `game_over`, `score_popup_shown`, `score_submitted`, `leaderboard_viewed`, `install_prompt_shown`, `install_prompt_clicked`, `install_prompt_dismissed`, `install_prompt_accepted`, `share_score_clicked`, `share_score_completed`, `share_score_failed`, and `share_score_fallback_copied`.

## Dashboard scope

The dashboard should be a separate route, likely `/analytics`, protected server-side by admin procedures. It should show: total events, active sessions, active users/sessions today, feature usage counts, recent events, device/browser/platform distribution, top locations, and share/install funnel metrics.

## Implementation notes

The existing `adminProcedure` should protect aggregated analytics procedures. Public analytics mutations should sanitize all input and tolerate database unavailability so gameplay never breaks. Frontend tracking should be best-effort and should not block game controls.
