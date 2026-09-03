# Development Log

## 2026-09-03 — MVP game, progress and progression layer

### Completed
- Preserved the existing Lightning UI in `worker.js`; it remains the legacy game and was not overwritten.
- Kept server-side Telegram initData verification and the normalized `record_game_session` persistence contract.
- Kept the `public.games` registry with enabled/disabled state, route, skill domain and ordering.
- Memory Grid is enabled at `/games/memory-grid` with duration, errors, grid size, pattern length and per-input timing telemetry.
- Switcher is enabled at `/games/switcher` with adaptation latency, post-change errors, overall accuracy and full-session duration telemetry.
- Focus Ribbon is enabled at `/games/focus-ribbon` with a long simple stimulus series, optional distractors, gradually faster tempo and first/middle/last-third accuracy telemetry.
- Fixed the Focus Ribbon source that caused the Cloudflare build failure at `games/focus_ribbon.js:4`.
- Added authenticated `Мой прогресс` at `/progress` and `/api/progress` using server-side Supabase access.
- Added a progression layer with basic achievements and daily quests at `/api/progression`.
- Added a robust home training catalog layer that reads enabled games from `/api/games` and exposes Memory Grid, Switcher and Focus Ribbon as selectable buttons.
- `focus_entry.js` now composes the progression layer, progress layer, game registry, isolated games and legacy Lightning Worker.

### Verified backend registry
The production Supabase `public.games` registry currently contains four enabled playable games: Lightning, Memory Grid, Switcher and Focus Ribbon. Pattern and Dual Stream remain disabled until independently verified.

### Current architecture
```text
Telegram Mini App
  -> focus_entry.js
     -> Focus Ribbon route
     -> progression_entry.js
        -> game catalog + achievements + daily quests
        -> progress_entry.js
           -> My Progress API/page
           -> worker_entry.js
              -> registry / isolated Memory Grid / Switcher
              -> Lightning legacy Worker
              -> Telegram verification
              -> normalized game API
                 -> Supabase RPC
                    -> players
                    -> game_sessions + metadata
                    -> player_game_stats
                    -> analytics view
```

### Deployment checkpoint
`wrangler.toml` points to `focus_entry.js` and uses compatibility date `2026-09-01`. Cloudflare Workers Builds documentation confirms that pushes to the configured production branch trigger the build and deploy flow, with `npx wrangler deploy` as the default deploy command. The available GitHub status endpoint exposes no Cloudflare check for the latest commits, so production build success cannot be claimed as externally verified from this environment. The last reported failure was the Focus Ribbon syntax error; the source has now been corrected and subsequent commits trigger the connected `main` build path.

### Next implementation block
Parent binding and parent reporting remain the next MVP block. After that, polish onboarding and recommendation logic; do not enable Pattern or Dual Stream until their isolated implementations pass the same persistence and build gates.
