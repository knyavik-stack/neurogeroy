# NeuroGeroy Architecture Status — 2026-09-08

## Production baseline
- Canonical Cloudflare Worker entrypoint: `main_app.js` (configured by `wrangler.toml`).
- `worker.js` is now a compatibility entrypoint that delegates to `main_app.js`, so an older deployment configuration pointing at `worker.js` receives the same application instead of the legacy Lightning-only page.
- `worker_entry.js` remains a narrow integration module containing only `POST /api/game-sessions`.
- Telegram initData verification for normalized game results and Progress is centralized in `telegram_auth.js`.
- Persistence: Supabase server RPC `record_game_session`.
- Game registry: `public.games`.
- Player-facing progress aggregates: `public.player_game_stats` plus raw `public.game_sessions`.

## Canonical routes
- `/` — main game menu.
- `/games/lightning` — Lightning v2, 5-round session.
- `/games/memory-grid` — Memory Grid v2, 8-round session.
- `/games/switcher` — Switcher v2.
- `/games/focus-ribbon` — Focus Ribbon v2.
- `/progress` — player progress.
- `/api/game-sessions` — normalized persistence endpoint.
- `/api/progress` — authenticated progress endpoint.

## Game lifecycle
1. Register game code and metadata in `public.games`.
2. Serve the game from an isolated route.
3. Use `POST /api/game-sessions` with the generic telemetry contract.
4. Validate persistence independently.
5. Expose the game in the main catalog.
6. From every game, `К играм` / `В меню` returns to `/`; result restart remains on the same game route.

## Current state
- `main_app.js` owns all player-facing HTML routes and delegates only the persistence API to `worker_entry.js`.
- The main menu explicitly contains the Telegram SDK bootstrap. This is required because the menu is also the source for Progress navigation and user identity; the previous menu did not load the SDK itself.
- Lightning is no longer dependent on the legacy worker. It records a five-round session with average reaction, false starts, completion and input timing.
- Memory Grid v2 is an 8-round session with aggregate accuracy, errors, input timings and total session duration.
- Focus Ribbon records full-session duration plus hits, misses, false hits, correct rejections and target count metadata.
- Switcher records full-session duration plus rule changes, adaptation timings and response counts.
- Progress returns all four known skills with zero values when the player has no sessions yet, avoiding an apparently empty profile.
- Failed game-result HTTP responses are surfaced by the shared HTML compatibility layer.

## Repository hygiene
- Legacy `worker.js` was backed up by Git history before replacement; backup manifest: `backups/2026-09-08/worker.legacy.BACKUP.md`.
- Removed dead entrypoint chains: `focus_entry.js`, `progression_entry.js`, `progress_entry.js`.
- Removed obsolete v1 game files: `games/focus_ribbon.js`, `games/memory_grid.js`, `games/switcher.js`.
- Historical migration drift is documented and not rewritten retroactively.

## Database state
- Live Supabase exposes exactly one normalized `record_game_session` signature.
- RPC execution is restricted to `service_role`.
- Current Progress reads `players`, `player_game_stats`, `game_sessions` and the enabled game catalog.

## Verification boundary
- Local Node syntax checks passed for the newly created canonical entrypoint and Lightning v2 before commit.
- GitHub Actions syntax validation is triggered by pushes to `main`.
- A real Telegram WebView smoke test and Cloudflare deployment/build logs are not exposed by the current connection. The repository is corrected, but production availability is not claimed as verified until the deployed Worker serves `main_app.js` and the full Telegram flow is tested.
