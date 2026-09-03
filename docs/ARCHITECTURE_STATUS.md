# NeuroGeroy Architecture Status — 2026-09-03

## Production baseline
- Cloudflare Worker entrypoint: `worker_entry.js`
- Legacy Lightning UI: `worker.js`
- Telegram initData verification: server-side
- Persistence: Supabase server RPC `record_game_session`
- Game registry: `public.games`
- Aggregate analytics: `public.player_game_analytics`

## Game lifecycle
1. Register game code and metadata in `public.games`.
2. Implement isolated game UI/route.
3. Use `POST /api/game-sessions` with the generic telemetry contract.
4. Validate persistence independently.
5. Expose the game in navigation through `GET /api/games`.
6. Disable through `games.enabled`; navigation hides it and its route guard rejects direct access.
7. Preserve historical `game_sessions` data when a game is disabled.

## Current state
- Lightning: production baseline preserved; generic persistence adapter exists.
- Memory Grid: isolated production route implemented, correctness fixed, telemetry implemented, registry route metadata added.
- Generic persistence: implemented with difficulty, score, reaction time, false starts, accuracy, duration, errors, grid size, pattern length and per-input timing.
- Registry navigation: implemented for enabled games with a configured route.
- Analytics: aggregate per-player/per-game view implemented from raw sessions.

## Architectural guarantee
Backend persistence does not need a new table/RPC for every new game. A new game can submit the existing generic session contract and add game-specific telemetry only when the schema already supports it. The registry controls availability separately from historical data.

## Critical engineering rule
Do not modify or replace `worker.js` while integrating additional games. New game UI must be served independently so a failed integration cannot remove Lightning.

## Next implementation
Build the player-facing progress/analytics layer on top of `player_game_analytics`, then continue with the next game from the product roadmap. Keep navigation and availability registry-driven.
