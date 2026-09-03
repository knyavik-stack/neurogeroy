# Memory Grid fix — 2026-09-03

## Root cause
The result screen calculated `correct` by comparing the player's selection order with the randomly generated pattern order. The game UI, however, asks the player to reproduce a spatial set, not an order. Therefore a correct set selected in a different order could be scored as incorrect.

## Fix
- Correctness is now based on set membership.
- Wrong cells increment `error_count` without ending the round.
- A round completes when all target cells are selected.
- Difficulty only advances after a clean completion.
- Result shows completion time and error count.

## Metrics now persisted
- `duration_ms`: active reproduction time.
- `error_count`: wrong cell selections.
- `accuracy_percent`.
- `grid_size`.
- `pattern_length`.
- `input_timing_ms`: elapsed milliseconds between reproduction inputs.
- `difficulty_level` and score/progression values.

## Verification
The canonical Supabase RPC was executed with a synthetic test session containing timing and error metrics. It returned the expected session/progression payload; the synthetic player/session data was deleted immediately after the test.

## Product alignment
The GDD requires Memory Grid to record fully-correct reproduction rate, average errors, and maximum grid size reached. The new metrics provide the required foundation; aggregate analytics and max-grid reporting remain a later progression/analytics task.
