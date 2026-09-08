# Development Log

## 2026-09-08 — Home UI iteration based on approved Home.jsx

### Changed
- Added `home_page.js` as the new root Home interface, using the supplied `Home.jsx` as the visual and interaction baseline.
- Preserved the product hierarchy: hero/character first, game choice second, progress and skill feedback immediately after.
- Added a persistent bottom navigation shell for Home, Hero, Games, Progress and More.
- Connected the Home screen to the existing authenticated `/api/progress` endpoint for real player name, level, XP, coins, game statistics and daily quest progress.
- Kept game actions on the existing working routes: Lightning, Memory Grid, Switcher and Focus Ribbon.
- Kept Telegram WebApp initialization and the existing save-failure guard in the canonical `main_app.js` path.
- Added responsive layout and Telegram safe-area handling.

### Deliberate boundaries
- Streak is not fabricated: the current progress API does not expose a streak value, so the UI does not invent one.
- Character customization is currently a UI interaction only; no claim of server persistence is made because the current player API does not expose cosmetic fields.
- The Hero and More navigation items do not pretend that separate production screens already exist.

### Verification boundary
- Source integration was committed to `main` in the canonical repository.
- Static repository-side syntax/production smoke verification still requires the available CI/deployment surface or a real Telegram WebView test; this log does not claim a production smoke test that was not performed.

## 2026-09-08 — Canonical entrypoint and Telegram recovery

### Fixed
- Replaced the split runtime entrypoint with `main_app.js`, which owns `/`, all four enabled game routes, `/progress`, `/api/progress` and delegates only the persistence POST to `worker_entry.js`.
- Added `games/lightning_v2.js`: Lightning is now a 5-round session with average reaction, false-start count, completion and per-round timing persistence instead of the legacy single-round bridge.
- Added an explicit Telegram SDK bootstrap to the main menu. The previous menu did not contain the SDK tag at all, so Telegram identity and `initData` were unavailable on `/` and Progress could not authenticate from the menu context.
- Replaced `worker.js` with a compatibility entrypoint to the canonical app. This closes the production failure mode where a deployment still pointing at `worker.js` exposed only the legacy Lightning page and returned no other games.
- Changed `wrangler.toml` to use `main_app.js` as the canonical Cloudflare entrypoint.
- Added a pre-replacement backup manifest for the legacy `worker.js`; the original immutable blob remains recoverable by SHA `18f1d1101609aa4ee9e5fb6e21c28e4facd4a173`.
- Kept the NeuroGeroy visual system on the main screen: identity (`КТО Я`), game choice (`ВО ЧТО ИГРАТЬ`), four skill-focused cards and progress as the third action.

### Navigation and persistence
- `/` is the only canonical game menu.
- `/games/lightning`, `/games/memory-grid`, `/games/switcher` and `/games/focus-ribbon` are direct game routes.
- `/progress` is the branded results/progress screen.
- All result writes continue through `/api/game-sessions` and the normalized Supabase RPC.
- Progress now returns all four catalog skills with zero values even when the player has not yet played, instead of rendering an empty skill list.

### Verification boundary
- `node --check` passed locally for the newly created `main_app.js` and `games/lightning_v2.js` before committing them.
- GitHub Actions syntax validation is triggered by the commits above; its successful result is required before calling the repository syntax-verified.
- A real Telegram WebView smoke test and Cloudflare production deployment status are still not exposed by this connection. The repository is corrected, but production is not claimed as independently verified until the deployed Worker serves the new entrypoint.

## 2026-09-08 — UI recovery, fast navigation and game-session reliability

### Fixed
- Rebuilt the main `/` screen around the approved NeuroGeroy visual direction: dark space/neural background, cyan/violet/orange accents, character-style hero block, explicit `КТО Я` section, explicit `ВО ЧТО ИГРАТЬ` section, skill labels and short game descriptions.
- Restored the product hierarchy that was lost during the earlier structural stabilization: identity first, game choice second, progress third.
- Removed the Supabase `games` lookup from normal GET navigation. The four currently enabled games are already known in the product catalog, so opening a game no longer waits for a database request.
- Reworked Telegram SDK loading on the root-rendered v2 pages from a blocking dependency to an asynchronous bootstrap.
- Rebuilt the Progress screen with the same branded visual system and made it wait for the Telegram SDK before requesting `/api/progress`.
- Strengthened the save-error overlay so non-OK responses and network exceptions on `/api/game-sessions` are surfaced to the player.

### Verification
- GitHub Actions syntax checks for the previous stabilization pass completed successfully.
- Cloudflare production deployment and a real Telegram WebView smoke test were not exposed by the connection.

## 2026-09-07 — Audit V2/V3 corrective pass

### Fixed
- Normalized `record_game_session` to one 15-parameter contract and removed legacy RPC overloads from the live database.
- Verified RPC permissions: `public`, `anon`, and `authenticated` cannot execute `record_game_session`; only `service_role` can.
- Added reproducible repository migrations for RPC cleanup and Lightning route alignment.
- Added centralized result-save error handling.
- Extended Memory Grid v2 to an 8-round session with aggregate metrics and input timings.

### Verification
- Transactional Supabase persistence smoke test passed and was rolled back, leaving no test player/session rows.
- Historical migration drift remains documented and was not rewritten retroactively.
- Server-side anti-cheat/recalculation remains unresolved.
