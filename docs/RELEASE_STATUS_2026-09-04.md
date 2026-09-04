# Release status — 2026-09-04

## Stabilization stage
- Replaced the nested Progress entrypoint chain with a direct root route to remove the failing Progress execution path associated with Cloudflare 1101.
- Restored the player progress route with player level, XP, coins, per-game metrics, achievements and daily quests.
- Removed the legacy home-page catalog injection from the production response path and replaced it with one lightweight compatibility catalog.
- Added an optimized root entrypoint while keeping the legacy Lightning UI intact.
- Added a 30-second server-side game-enabled cache to avoid a Supabase round-trip on every isolated game load.
- Scoped the remaining home-page MutationObserver to `#app` child-list changes only; Lightning result persistence remains active while unrelated document mutations no longer trigger the observer.
- Corrected Focus Ribbon semantics: only ◆ is a target; ● and ★ are always non-targets, with misses and false presses scored separately.
- Corrected Switcher rule display and scoring; matching stimuli are hits, non-matching stimuli are correct rejections when ignored, and presses on non-matching stimuli are errors.
- Replaced Memory Grid with an isolated implementation using an explicit exact-order rule: the player must reproduce the displayed sequence in order; the first wrong cell ends the round and is counted as an error.
- Fixed Focus Ribbon and Switcher session duration to measure the complete session rather than only the final round.
- All game result submissions use the existing authenticated `/api/game-sessions` contract.

## Current main commits
- `9391dfa5608c74719c7f6cb8d2000bbe908d4566` — keep Lightning persistence while scoping the home observer to `#app` child-list changes.
- `640577148d657dac25ae04dc41c56fdc6a2469b4` — align architecture documentation with the root entrypoint and current Progress data source.
- `384f0f1070891e3a910d783fcc95d3eba19ec5e8` — record stabilization audit and remaining P1 Lightning gap.

## Acceptance gate
**Code stabilization: READY for the changes verified in repository code.** GitHub Actions provides JavaScript syntax validation for the latest code.

**Production smoke test: NOT VERIFIED.** The current tool connection does not expose Cloudflare deployment/build logs and cannot execute a Telegram WebView test. A GitHub Actions success is not proof that the latest `main` commit is live in Cloudflare production.

## Known P1/P0 risks / next verification
1. Verify the actual Cloudflare deployment version before judging production behavior.
2. In Telegram, open the Mini App twice and confirm exactly one catalog, no duplicate buttons and no growing lag.
3. Open Progress and confirm no 1101; then play each enabled game and confirm the session appears in Progress.
4. Verify `/api/game-sessions` persistence and `player_game_stats` values for a real Telegram user.
5. Lightning remains GDD-incomplete: current legacy implementation is a single reaction round and does not provide the GDD-required session-level average reaction, accuracy and false-press metrics. Fix this before adding new games/features.
6. If production remains slow after deployment is confirmed, profile actual network/DOM cost rather than adding more UI logic blindly.
7. Do not declare production-ready until the real Telegram smoke test passes on iOS and Android.
