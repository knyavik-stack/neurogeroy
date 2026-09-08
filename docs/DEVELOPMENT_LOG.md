# Development Log

## 2026-09-08 — UI recovery, fast navigation and game-session reliability

### Fixed
- Rebuilt the main `/` screen around the approved NeuroGeroy visual direction: dark space/neural background, cyan/violet/orange accents, character-style hero block, explicit `КТО Я` section, explicit `ВО ЧТО ИГРАТЬ` section, skill labels and short game descriptions.
- Restored the product hierarchy that was lost during the earlier structural stabilization: identity first, game choice second, progress third.
- Removed the Supabase `games` lookup from normal GET navigation. The four currently enabled games are already known in the product catalog, so opening a game no longer waits for a database request. This removes an avoidable network dependency from the critical tap-to-game path.
- Changed game and menu navigation to direct `location.href` navigation, avoiding the previous nested `replace()` behavior in Telegram WebView.
- Reworked Telegram SDK loading on the root-rendered v2 pages from a blocking `<script src=...>` dependency to an asynchronous bootstrap. The v2 games now resolve `Telegram.WebApp` dynamically through `getTelegram()`, so the SDK can load without delaying first paint or breaking later persistence calls.
- Reworked Memory Grid, Switcher and Focus Ribbon to use the same non-blocking Telegram access pattern and improved their visual hierarchy to match the NeuroGeroy brand direction.
- Rebuilt the Progress screen with the same branded visual system and made it explicitly wait for the Telegram SDK before requesting `/api/progress`.
- Strengthened the save-error overlay so both non-OK responses and network exceptions on `/api/game-sessions` are surfaced to the player.
- Kept `worker.js` untouched during this pass; Lightning remains isolated behind `/games/lightning` and its compatibility bridge.

### Game/session reliability
- Memory Grid still runs 8 rounds and now uses the non-blocking Telegram integration for result persistence.
- Switcher now uses the same persistence path and direct menu navigation.
- Focus Ribbon now uses the same persistence path and direct menu navigation.
- Progress continues to read the normalized player/session/statistics model through `/api/progress`.

### Verification
- GitHub Actions syntax check for the Focus Ribbon change completed successfully (`run #69`).
- A new repository-wide syntax check was triggered automatically for the final Progress change (`run #70`); its completion must be observed before treating the latest commit as syntax-verified.
- Cloudflare production deployment and a real Telegram WebView smoke test are still not exposed by the current connection. Production availability is therefore not claimed as verified.

### Known remaining work
- Lightning is still the legacy/GDD-incomplete game and needs a dedicated session-level normalization pass.
- The root asynchronous Telegram bootstrap is applied to pages that contain the official SDK tag; the menu currently remains functional without Telegram identity and falls back to `Герой` until the identity bootstrap is explicitly added to that page.
- The brand reference images are stored in the repository `design/` area and were used as the visual direction; they are not yet served as first-class Worker assets, so the current UI uses lightweight CSS artwork rather than adding a multi-megabyte runtime image dependency.
- Server-side anti-cheat/recalculation remains unresolved.
- `no-store` remains intentional until a real Telegram production smoke test proves correctness.

## 2026-09-07 — Audit V2/V3 corrective pass

### Fixed
- Re-read the attached Audit V2 first, then Audit V3, and applied the overlapping P0/P1 findings instead of treating the reports as separate queues.
- Reduced `worker_entry.js` to a single `/api/game-sessions` handler. It no longer contains dead v1 game renderers, the obsolete game catalog, or a second Telegram HMAC implementation; Telegram validation is imported from `telegram_auth.js`.
- Removed dead entrypoint chains `focus_entry.js`, `progression_entry.js`, and `progress_entry.js`.
- Removed obsolete v1 game files `games/focus_ribbon.js`, `games/memory_grid.js`, and `games/switcher.js`.
- Removed the obsolete root note `error 422.md`.
- Removed the duplicate GitHub JavaScript syntax workflow; `.github/workflows/javascript-syntax.yml` remains as the single syntax check.
- Fixed the repository migration that previously attempted to drop the wrong `record_game_session` signature. The migration now removes the legacy Lightning RPC and the 9- and 13-parameter overloads before creating the normalized 15-parameter RPC.
- Applied the same exact RPC cleanup to the live Supabase project. Live verification now shows exactly one `record_game_session` signature: the normalized 15-parameter version; the legacy `record_lightning_session` and older overloads are gone.
- Verified RPC permissions: `public`, `anon`, and `authenticated` cannot execute `record_game_session`; only `service_role` can.
- Added `supabase/migrations/20260907000000_remove_legacy_game_session_rpcs.sql` so the cleanup is reproducible from the repository.
- Added centralized HTML hardening in `root_entry.js`: failed `/api/game-sessions` responses are surfaced to the player instead of remaining completely silent.
- Extended Memory Grid v2 from a single short attempt to an 8-round session, with aggregate accuracy, errors, input timings and total session duration.

### Verification
- Local Node syntax check passed for the rewritten `worker_entry.js` and the new Memory Grid v2 source.
- Live Supabase RPC smoke test completed inside a transaction and rolled back. The normalized RPC successfully created the expected player/session/stats objects and returned level, score, duration, error, experience and coins; the rollback left `players`, `game_sessions`, and `player_game_stats` at 0 rows.
- Live Supabase function inspection confirms only the normalized 15-argument `record_game_session` remains, with execution restricted to `service_role`.
- Cloudflare deployment and Telegram WebView smoke test remain unverified because this connection does not expose Cloudflare deployment logs or a browser.

### Remaining audit items
- Historical migration drift versus the Supabase migration history remains documented and is not being rewritten retroactively.
- Lightning remains legacy/GDD-incomplete.
- Server-side anti-cheat/recalculation of game scores is not yet implemented.
- Edge caching remains disabled by `no-store` until correctness is production verified.

## 2026-09-07 — Navigation and loading stabilization

### Fixed
- Restored deterministic application navigation: `/` is now the main game menu, not the Lightning game.
- Added the canonical Lightning route `/games/lightning` while preserving the legacy Lightning implementation without editing `worker.js`.
- All v2 game `К играм` / `В меню` buttons now return to the real main menu at `/`.
- Progress `К играм` returns to `/`.

### Navigation contract
- `/` — main menu
- `/games/lightning` — Молния
- `/games/memory-grid` — Память-сетка
- `/games/switcher` — Переключатель
- `/games/focus-ribbon` — Фокус-лента
- `/progress` — Мой прогресс
- From every game: `К играм` / `В меню` -> `/`.
- From a result screen: `Ещё раз` stays in the same game; `В меню` -> `/`.
- From Progress: `К играм` -> `/`.

### Important implementation boundary
- `worker.js` was not modified. Its current legacy Lightning implementation remains protected.
- The previous root observer recursion fix remains preserved; the new root no longer depends on that compatibility catalog observer.

### Verification boundary
- Repository code was inspected directly before the change.
- Cloudflare deployment status and a real Telegram WebView smoke test are not available through the current connection, so production loading is not claimed as verified yet.
