# Переключатель — implementation note

## Source requirements
The GDD defines Switcher as a cognitive-flexibility game: the player follows a simple rule, then the rule changes without warning. Required metrics are adaptation speed after a rule change, errors immediately after a change, and overall accuracy.

## Current implementation
`games/switcher.js` is an isolated client module prepared for production integration.

- Levels 1–6.
- Rule alternates between color and shape.
- Change frequency increases with difficulty.
- Response window decreases with difficulty.
- Adaptation latency is recorded for each rule change.
- Errors immediately after a rule change are tracked separately.
- Overall accuracy and total errors are recorded.
- Difficulty can increase on the next round after a strong result.

## Persistence
Generic `record_game_session` now accepts `metadata` in addition to normalized metrics. Switcher stores rule-specific fields such as rule-change count and errors immediately after rule changes there, while adaptation latencies use `input_timing_ms`.

## Integration gate
The module is not added to `public.games.route` until it is wired into `worker_entry.js`. This prevents the catalog from exposing a route that is not yet served.

The GDD target is a 40–90 second session, short rules, gradual difficulty, and a concise result screen.
