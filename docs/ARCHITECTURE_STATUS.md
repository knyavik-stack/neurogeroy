# NeuroGeroy Architecture Status — 2026-09-03

## Production baseline
- Cloudflare Worker entrypoint: `worker_entry.js`
- Legacy Lightning UI: `worker.js`
- Telegram initData verification: server-side
- Persistence: Supabase server RPC
- Game registry: `public.games`

## Game lifecycle
1. Register game code.
2. Implement isolated game UI.
3. Use `POST /api/game-sessions`.
4. Validate persistence independently.
5. Expose game in navigation only after verification.
6. Disable through `games.enabled` without deleting history.

## Current state
- Lightning: production baseline preserved; persistence compatibility adapter exists.
- Memory Grid: isolated module implemented and documented; not yet exposed in production navigation.
- Generic persistence: implemented.

## Critical engineering rule
Do not modify or replace `worker.js` while integrating additional games. New game UI must be served independently so a failed integration cannot remove Lightning.

## Next implementation
Add a dedicated `/games/memory-grid` route served by `worker_entry.js`, then connect its result submission directly to `/api/game-sessions`. Navigation integration comes after route-level verification.
