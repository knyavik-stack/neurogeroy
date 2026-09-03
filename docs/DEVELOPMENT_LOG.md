# Development Log

## 2026-09-03 — MVP game and progress implementation

### Completed
- Preserved the existing Lightning UI in `worker.js`.
- Kept the server-side Telegram initData verification and normalized `record_game_session` persistence contract.
- Kept the `public.games` registry with enabled/disabled state, route, skill domain and ordering.
- Memory Grid is enabled at `/games/memory-grid` with duration, errors, grid size, pattern length and per-input timing telemetry.
- Switcher is enabled at `/games/switcher` with adaptation latency, post-change errors and overall accuracy telemetry.
- Focus Ribbon is now implemented as an isolated module at `/games/focus-ribbon`.
- Focus Ribbon uses a long simple stimulus series, optional distractors, gradually faster tempo and records first/middle/last-third accuracy plus accuracy drop, matching the GDD metric contract.
- Added authenticated `Мой прогресс` at `/progress` and `/api/progress` using server-side Supabase access.
- Progress shows character level, experience, coins and three skill cards with measurable statistics and a today-vs-seven-days-ago comparison when data exists.
- Added layered Worker entrypoints so new screens/routes do not require overwriting the legacy Lightning Worker.
- Created a dated backup branch before the progress structural change.
- Triggered a fresh `main` deployment commit after the production symptom showed that the repository implementation and the live game set had diverged.

### Current architecture
```text
Telegram Mini App
  -> focus_entry.js
     -> Focus Ribbon route
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

### Current MVP game set
1. Lightning — reaction speed
2. Memory Grid — working memory
3. Switcher — cognitive flexibility
4. Focus Ribbon — sustained attention

Pattern and Dual Stream remain disabled until their isolated implementations are verified.

### Deployment checkpoint
`wrangler.toml` now points to `focus_entry.js`, which composes the existing Worker entry and the new progress/game routes. The compatibility date remains `2026-09-01`. Cloudflare Workers Builds documentation confirms that a connected Worker deploys from pushes to the configured production branch; the repository currently uses `main`. Production build success itself is not exposed through the available GitHub status endpoint, so it is not claimed as verified here.

### Next implementation block
Complete the remaining Must-level progression layer: basic achievements and daily quests, then parent binding/reporting. Do not add Should/Could features before the remaining Must items are stable.
