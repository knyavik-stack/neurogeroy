# Development Log

## 2026-09-07 — Audit V2/V3 corrective pass

### Fixed
- Re-read the attached Audit V2 first, then Audit V3, and applied the overlapping P0/P1 findings instead of treating the reports as separate queues.
- Reduced `worker_entry.js` to a single `/api/game-sessions` handler. It no longer contains dead v1 game renderers, the obsolete game catalog, or a second Telegram HMAC implementation; Telegram validation is imported from `telegram_auth.js`.
- Removed dead entrypoint chains `focus_entry.js`, `progression_entry.js`, and `progress_entry.js`.
- Removed obsolete v1 game files `games/focus_ribbon.js`, `games/memory_grid.js`, and `games/switcher.js`.
- Removed the obsolete root note `error 422.md`.
- Removed the duplicate GitHub JavaScript syntax workflow; `.github/workflows/javascript-syntax.yml` remains as the single syntax check.
- Fixed the repository migration that previously attempted to drop the wrong `record_game_session` signature. The migration now removes the legacy Lightning RPC and the 9- and 13-parameter overloads before creating the normalized 15-parameter RPC.
- Applied the same exact RPC cleanup to the live Supabase project. Live verification now shows exactly one `record_game_session` signature: the normalized 15-parameter version; the legacy `record_lightning_session` and older overloads are gone.
- Verified RPC permissions: `public`, `anon`, and `authenticated` cannot execute `record_game_session`; only `service_role` can.
- Added `supabase/migrations/20260907000000_remove_legacy_game_session_rpcs.sql` so the cleanup is reproducible from the repository.
- Added centralized HTML hardening in `root_entry.js`: Telegram WebApp SDK is changed to `defer`, and failed `/api/game-sessions` responses are surfaced to the player instead of remaining completely silent.
- Extended Memory Grid v2 from a single 5–20 second attempt to an 8-round session, with aggregate accuracy, errors, input timings and total session duration. The intended session window is now approximately 40–90 seconds rather than a single short attempt.

### Verification
- Local Node syntax check passed for the rewritten `worker_entry.js` and the new Memory Grid v2 source.
- Live Supabase RPC smoke test completed inside a transaction and rolled back. The normalized RPC successfully created the expected player/session/stats objects and returned level, score, duration, error, experience and coins; the rollback left `players`, `game_sessions`, and `player_game_stats` at 0 rows.
- Live Supabase function inspection confirms only the normalized 15-argument `record_game_session` remains.
- Cloudflare deployment and Telegram WebView smoke test remain unverified because this connection does not expose Cloudflare deployment logs or a browser.

### Remaining audit items
- The repository still has historical migration drift versus the Supabase migration history. The current schema is represented by the repository's consolidated migrations plus the new cleanup migration, but the old applied migration history has not been rewritten, which would be unsafe on a live database.
- Lightning remains legacy/GDD-incomplete. Its persistence compatibility layer still extracts the displayed reaction result from the legacy UI; this is deliberately left for the dedicated Lightning normalization pass rather than mixing it into the structural cleanup.
- Server-side anti-cheat/recalculation of game scores is not yet implemented.
- Edge caching remains disabled by `no-store`; this is deferred until game/session correctness is production-verified.

## 2026-09-07 — Navigation and loading stabilization

### Fixed
- Restored deterministic application navigation: `/` is now the main game menu, not the Lightning game.
- Added the canonical Lightning route `/games/lightning` while preserving the legacy Lightning implementation without editing `worker.js`.
- The Lightning route internally rewrites only the legacy request to `/`, so existing Lightning code continues to work while its public URL is isolated from the main menu.
- Removed the root compatibility catalog injection. The old approach coupled the home page to the legacy Lightning DOM and was a source of navigation and observer complexity.
- Main menu now renders the enabled game registry and has one explicit `Мой прогресс` route.
- All v2 game `К играм` / `В меню` buttons now return to the real main menu at `/`.
- Progress `К играм` already returns to `/`; the route is now a real menu, so it no longer reopens Lightning.
- Lightning result persistence compatibility code is now attached only to `/games/lightning`, with a scoped observer that does not mutate the observed DOM.

### Navigation contract
- `/` — main menu
- `/games/lightning` — Молния
- `/games/memory-grid` — Память-сетка
- `/games/switcher` — Переключатель
- `/games/focus-ribbon` — Фокус-лента
- `/progress` — Мой прогресс
- From every game: `К играм` / `В меню` -> `/`.
- From a result screen: `Ещё раз` stays in the same game; `В меню` -> `/`.
- From Progress: `К играм` -> `/`.

### Important implementation boundary
- `worker.js` was not modified. Its current legacy Lightning implementation remains protected.
- The previous root observer recursion fix remains preserved; the new root no longer depends on that compatibility catalog observer.

### Verification boundary
- Repository code was inspected directly before the change.
- GitHub commit created: `fbbda1ef33cb4fb09ff67a361112cdc9c64165dd`.
- Cloudflare deployment status and a real Telegram WebView smoke test are not available through the current connection, so production loading is not claimed as verified yet.

## 2026-09-04 — Stabilization pass before next MVP

### Fixed
- Removed the duplicate home catalog injection: the progression layer no longer renders a second game menu. The root entrypoint owns the compatibility catalog injection.
- Current production entry chain is `root_entry.js -> worker_entry.js -> worker.js` for `/`, with direct root routes for Progress and the isolated v2 games.
- Hardened `Мой прогресс`: it renders player data, per-game skill metrics, achievements and daily quests.
- Changed navigation from progress and game screens to `location.replace('/')` to avoid stale nested navigation in the Mini App webview.
- Hardened Switcher and Focus Ribbon controls by binding buttons through `document.getElementById` and using the common home navigation path.
- Recorded Focus Ribbon enablement in the Supabase migration history and repository migration file.
- Added GitHub JavaScript syntax validation workflows.
- Found and fixed a critical recursive home-page observer loop. The compatibility observer called `renderCatalog()` on every mutation, while `renderCatalog()` changed the observed DOM; this could continuously retrigger itself and cause excessive CPU/DOM work, slow loading, freezes and potentially Cloudflare Worker 1101 symptoms.
- Catalog rendering is now performed once. The remaining observer only scans Lightning result changes inside `#app` and never mutates the DOM from its callback.
- Found and fixed the direct cause of the reported Cloudflare `/progress` exception: the Worker `fetch()` handler returned the string produced by `renderProgressPage()` instead of a `Response`. Cloudflare Workers requires the fetch handler Promise to resolve to a `Response`; `/progress` now wraps the rendered HTML in `new Response(...)` with HTML headers.

### Backend verification
- Verified `public.games`: exactly four enabled playable games are registered — Lightning, Memory Grid, Switcher and Focus Ribbon. Pattern and Dual Stream remain disabled.
- Verified `game_sessions` contains the fields used by current persistence, including `created_at`, `completed_at`, `duration_ms`, `error_count`, `input_timing_ms` and `metadata`.
- Verified current Progress reads `player_game_stats`, matching the table written by `record_game_session`; the historical `player_game_analytics` table is not used as the source of current Progress metrics.
- Verified `record_game_session` exists with the current 15-parameter contract and writes player, session and per-game stats records.
- Previous transactional persistence test was cleaned up; production currently has no player/session rows after that cleanup.

### Game audit against GDD
- Memory Grid v2 currently enforces exact sequence order and records full session duration, errors, grid size, pattern length, input timing and completion metadata.
- Focus Ribbon v2 separates target hits, target misses, false hits and correct rejections and records full session duration.
- Switcher v2 alternates COLOR/SHAPE rules and records rule changes, adaptation timings and full session duration.
- Lightning remains legacy and is not yet GDD-complete: the current implementation is a single reaction round and does not provide the GDD-required session-level average reaction, accuracy and false-press metrics. This remains P1 and must be addressed before expanding the product beyond stabilization.

### Deployment boundary
The repository is connected to Cloudflare Workers Builds, but the current tool connection does not expose Cloudflare deployment/build logs. GitHub Actions is triggered by pushes, but a successful syntax workflow is not proof of Cloudflare production deployment. A real Telegram WebView smoke test is still required.

### Current gate
The navigation/loading stabilization commit is `fbbda1ef33cb4fb09ff67a361112cdc9c64165dd`. Do not start parent binding/reporting or further game expansion until this commit is deployed and the Telegram smoke path works: open app -> main menu -> open each enabled game -> finish -> return to menu -> open Progress -> verify persistence -> reopen Mini App and verify persistence again.
