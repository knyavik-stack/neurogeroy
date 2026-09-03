# Development Log

## 2026-09-03 — Extensible game foundation

### Completed
- Added normalized `record_game_session` persistence contract.
- Added server-side Telegram initData verification for game results.
- Preserved the existing Lightning UI in `worker.js`.
- Added the `public.games` registry with enabled/disabled state, route, skill domain and ordering.
- Added registry-backed `GET /api/games`.
- Added route-level enabled checks for isolated games.
- Added Memory Grid telemetry: duration, errors, grid size, pattern length and per-input timing.
- Added generic `game_sessions.metadata` for game-specific metrics without changing the core session schema for every new game.
- Prepared and integrated the isolated Switcher module at `/games/switcher`.
- Switcher records overall accuracy, total errors, adaptation latency and errors immediately after rule changes.
- Enabled Switcher in the game registry only after its route was integrated.
- Verified the generic RPC accepts Switcher-specific metadata and cleaned the synthetic test data.

### Current architecture
```text
Telegram Mini App
  -> Worker entry
     -> registry / isolated game route
     -> Telegram verification
     -> normalized game API
        -> Supabase RPC
           -> players
           -> game_sessions + metadata
           -> player_game_stats
           -> analytics view
```

### Current production game set
1. Lightning — reaction speed
2. Memory Grid — working memory
3. Switcher — cognitive flexibility

The remaining MVP games stay out of navigation until their isolated routes are implemented and verified.

### Next implementation task
Implement the Must-level `Мой прогресс` screen using the collected per-game statistics, with a short self-comparison view. The PRD requires visible growth across 2–3 skills and a simple `today vs week ago` comparison; the product concept explicitly prioritizes measurable progress rather than unsupported claims.
