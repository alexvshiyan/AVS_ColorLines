# Color Lines Analytics Local Verification — 2026-05-21

## Build checks

`pnpm check && pnpm build` completed successfully after adding the first-party analytics foundation, analytics dashboard route, online player heartbeat/indicator, and Share Score UI. Vite generated the production assets without TypeScript errors.

## Local Home route

URL checked: `http://localhost:3004/`

The game rendered successfully with no runtime errors in the browser console. The header shows the new `ONLINE 0` arcade indicator and the current build timestamp. The main 9×9 board, controls, install banner, sound toggle and Global Records panel remain visible.

Browser console after loading Home contained only the React DevTools suggestion and service worker registration log; no analytics hook/runtime errors were observed.

## Local Analytics route

URL checked: `http://localhost:3004/analytics`

The analytics route rendered the authentication gate locally. A fallback was added to `getLoginUrl()` so missing local OAuth environment variables do not crash the dashboard route during development. In production, configured OAuth env values continue to produce the normal login URL.
