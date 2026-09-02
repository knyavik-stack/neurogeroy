# Game API Contract

## Endpoint
`POST /api/game-sessions`

The endpoint authenticates Telegram WebApp initData server-side and persists only registered, enabled games.

## Request
```json
{
  "initData": "<Telegram WebApp initData>",
  "game_code": "lightning",
  "score": 750,
  "difficulty": 1,
  "reaction_ms": 250,
  "false_starts": 0,
  "accuracy_percent": null
}
```

## Rules
- `game_code` must match an enabled row in `public.games`.
- Score: integer 0..1,000,000.
- Difficulty: integer 1..20.
- Reaction: integer 1..60,000 when supplied.
- False starts: integer 0..100.
- Accuracy: 0..100 when supplied.
- Telegram identity is derived from verified initData; client-supplied identity is ignored.

## Response
```json
{
  "ok": true,
  "game_code": "lightning",
  "experience_earned": 13,
  "coins_earned": 3,
  "total_experience": 100,
  "total_coins": 20
}
```

## Migration strategy
Lightning remains visually implemented in the legacy UI while its persistence adapter calls this endpoint. New games must use this contract directly.

## Operational rule
Do not replace the legacy game UI during backend migrations. Verify persistence independently before modifying gameplay UI.
