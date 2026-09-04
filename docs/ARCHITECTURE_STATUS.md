# NeuroGeroy Architecture Status — 2026-09-04

## Production baseline
- Cloudflare Worker entrypoint: `root_entry.js` (configured by `wrangler.toml`).
- Legacy Lightning UI/backend: `worker.js`, preserved and not rewritten by the stabilization work.
- Telegram initData verification: server-side.
- Persistence: Supabase server RPC `record_game_session`.
- Game registry: `public.games`.
- Player-facing progress aggregates: `public.player_game_stats` plus raw `public.game_sessions`.
- `public.player_game_analytics` remains historical/aggregate infrastructure and is not the source for the current Progress screen.

## Game lifecycle
1. Register game code and metadata in `public.games`.
2. Implement isolated game UI/route.
3. Use `POST /api/game-sessions` with the generic telemetry contract.
4. Validate persistence independently.
5. Expose the game in navigation through the enabled game registry.
6. Disable through `games.enabled`; isolated routes enforce the same flag and historical session data is preserved.

## Current state
- Root entrypoint serves the current Progress route and isolated v2 routes for Memory Grid, Switcher and Focus Ribbon.
- Lightning remains the protected legacy implementation and is reached through `/`.
- Memory Grid uses the strict-order v2 implementation and records duration, errors, grid size, pattern length, input timings and completion metadata.
- Focus Ribbon records full-session duration plus hits, misses, false hits, correct rejections and target count metadata.
- Switcher records full-session duration plus rule changes, adaptation timings and response counts.
- Generic persistence validates game metrics server-side and updates `players`, `game_sessions` and `player_game_stats` atomically through `record_game_session`.
- The home-page compatibility layer keeps Lightning persistence but scopes its MutationObserver to `#app` child-list changes instead of observing the entire document subtree.

## Critical engineering rule
Do not modify or replace `worker.js` while integrating or stabilizing additional games unless the exact current version is backed up first. New game UI should be served independently so a failed integration cannot remove Lightning.

## Verification boundary
Code and repository checks are not equivalent to production verification. The current tool connection can inspect GitHub and Supabase but cannot inspect Cloudflare deployment/build logs or execute a Telegram WebView smoke test. Production-ready status therefore remains unverified until the real Telegram flow passes.
