# Мой прогресс — implementation contract

The PRD marks the simple `Мой прогресс` screen as Must: the player should see growth across 2–3 skills. A `today vs week ago` comparison is Should. The product concept requires progress to be shown through measurable values rather than vague claims.

## Data source
Use `player_game_analytics` plus recent `game_sessions` grouped by the skill domain from `public.games`.

## MVP display
- Player level, experience and coins.
- Three strongest available skill domains with a compact metric.
- Per-skill best/current value using the metric appropriate to the game.
- Today vs seven-days-ago comparison when enough sessions exist.
- Recent games and session count.

## Constraints
- No complex scientific charts in MVP.
- No unsupported claims about IQ or school performance.
- Keep the result readable in seconds.
- Recommendations remain suggestions, not commands.
