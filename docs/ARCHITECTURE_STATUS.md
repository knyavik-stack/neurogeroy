# NeuroGeroy Architecture Status — 2026-09-07

## Production baseline
- Cloudflare Worker entrypoint: `root_entry.js` (configured by `wrangler.toml`).
- Legacy Lightning implementation: `worker.js`, preserved and not rewritten by the current cleanup.
- `worker_entry.js` is now a narrow integration module containing only `POST /api/game-sessions` and importing Telegram validation from `telegram_auth.js`.
- Telegram initData verification for normalized game results is centralized in `telegram_auth.js`.
- Persistence: Supabase server RPC `record_game_session`.
- Game registry: `public.games`.
- Player-facing progress aggregates: `public.player_game_stats` plus raw `public.game_sessions`.
- `public.player_game_analytics` remains historical/aggregate infrastructure and is not the source for the current Progress screen.

## Canonical routes
- `/` — main game menu.
- `/games/lightning` — Lightning, served through the protected legacy implementation.
- `/games/memory-grid` — Memory Grid v2.
- `/games/switcher` — Switcher v2.
- `/games/focus-ribbon` — Focus Ribbon v2.
- `/progress` — player progress.
- `/api/game-sessions` — normalized persistence endpoint.
- `/api/progress` — authenticated progress endpoint.

## Game lifecycle
1. Register game code and metadata in `public.games`.
2. Implement isolated game UI/route.
3. Use `POST /api/game-sessions` with the generic telemetry contract.
4. Validate persistence independently.
5. Expose the game in navigation through the enabled game registry.
6. Disable through `games.enabled`; isolated routes enforce the same flag and historical session data is preserved.
7. From every game, `К играм` / `В меню` returns to `/`; result restart remains on the same game route.

## Current state
- Root entrypoint owns navigation, Progress, v2 game routes and the Lightning compatibility boundary.
- Lightning remains the protected legacy implementation and is reached through `/games/lightning`; its legacy request is internally rewritten to `/` only inside the Worker.
- Memory Grid v2 is an 8-round session with aggregate accuracy, errors, input timings and total session duration.
- Focus Ribbon records full-session duration plus hits, misses, false hits, correct rejections and target count metadata.
- Switcher records full-session duration plus rule changes, adaptation timings and response counts.
- Generic persistence validates game metrics server-side and updates `players`, `game_sessions` and `player_game_stats` atomically through the single 15-parameter `record_game_session` RPC.
- The legacy Lightning persistence adapter still uses a scoped DOM result observer because Lightning itself has not yet been rewritten to emit the normalized result directly.
- Failed game-result HTTP responses are surfaced by the root HTML compatibility layer instead of being silently ignored.

## Repository hygiene
- Removed dead entrypoint chains: `focus_entry.js`, `progression_entry.js`, `progress_entry.js`.
- Removed obsolete v1 game files: `games/focus_ribbon.js`, `games/memory_grid.js`, `games/switcher.js`.
- Removed the obsolete duplicate CI workflow and the duplicate root worker backup.
- `worker.js` remains protected; `backup_worker.js` and the dated `backups/2026-09-03/worker_entry.BACKUP.js` preserve prior baselines.

## Database state
- Live Supabase currently exposes exactly one `record_game_session` signature: the normalized 15-parameter version.
- Legacy `record_lightning_session` and the old 9-/13-parameter `record_game_session` overloads were removed through a live migration.
- RPC execution is restricted to `service_role`.
- The repository now contains the exact cleanup migration and the historical migration drift is documented rather than rewriting the already-applied production migration history.

## Critical engineering rule
Do not modify or replace `worker.js` while integrating or stabilizing additional games unless the exact current version is backed up first. New game UI should be served independently so a failed integration cannot remove Lightning.

## Verification boundary
Code and repository checks are not equivalent to production verification. The current tool connection can inspect GitHub and Supabase but cannot inspect Cloudflare deployment/build logs or execute a Telegram WebView smoke test. Production-ready status therefore remains unverified until the real Telegram flow passes.
