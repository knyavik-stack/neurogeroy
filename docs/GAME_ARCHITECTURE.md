# NeuroGeroy Game Architecture

## Goal
Add, enable, disable, or retire games without rewriting player identity, session persistence, progression, or the Cloudflare deployment shell.

## Stable contracts
- `games.code` is the canonical game identifier.
- Every completed round creates a `game_sessions` record.
- `players` owns identity and global progression.
- `player_game_stats` stores aggregates per player/game.
- Game-specific UI must emit a normalized result object; storage is owned by the server layer.

## Registry
The `public.games` table is the source of truth for:
- title
- skill domain
- enabled/disabled state
- ordering
- versioned configuration

Disabling a game is a data change:
`update public.games set enabled = false where code = 'game_code';`

Historical sessions remain intact.

## Normalized result contract
```json
{
  "game_code": "memory_grid",
  "difficulty_level": 2,
  "score": 620,
  "accuracy_percent": 87,
  "metrics": {}
}
```

A game may add metrics without changing global tables by placing game-specific values in a future JSONB metrics field.

## Change safety
1. Never replace a working game file with an experimental shell.
2. New games are isolated behind a unique `game_code`.
3. Existing session history is append-only.
4. Disable first; delete only after a migration and retention review.
5. Production changes must preserve the Telegram auth path and existing game UI.

## Current limitation
The present Lightning persistence adapter still uses a Lightning-specific RPC and HTML injection. Before the second game is connected, this should be replaced by an explicit normalized game-result endpoint so all games use one server contract.
