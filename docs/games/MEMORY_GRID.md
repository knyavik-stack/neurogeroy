# Memory Grid — Product Specification

## Status
Planned implementation. The game is registered as `memory_grid` and uses the normalized game session API.

## Objective
A player memorizes illuminated cells in a grid and reproduces the pattern.

## Round model
- Difficulty 1: 3x3 grid, 3 cells.
- Difficulty 2: 3x3 grid, 4 cells.
- Difficulty 3: 4x4 grid, 5 cells.
- Higher difficulty increases pattern length and grid complexity.
- Pattern display is time-limited.
- Input begins only after the pattern disappears.

## Result model
```json
{
  "game_code": "memory_grid",
  "score": 0,
  "difficulty": 1,
  "false_starts": 0,
  "accuracy_percent": 0
}
```

Score is calculated from correct selections, completion, and difficulty. The client never supplies player identity; Telegram initData is verified server-side.

## UX requirements
- One-handed Telegram-first layout.
- Clear state transition: memorize → reproduce → result.
- Haptic feedback for success/error when Telegram supports it.
- No dependency on Lightning-specific DOM or mutation observers.

## Safety rule
Memory Grid must be implemented as a separate module/route before it is exposed from the production home screen. Lightning remains unchanged until the new module is independently verified.
