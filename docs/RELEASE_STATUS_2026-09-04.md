# Release status — 2026-09-04

## Stabilization stage
- Replaced the nested Progress entrypoint chain with a direct root route to remove the failing Progress execution path associated with Cloudflare 1101.
- Restored the player progress route with player level, XP, coins, per-game metrics, achievements and daily quests.
- Removed the legacy home-page catalog injection from the production response path and replaced it with one lightweight compatibility catalog.
- Added an optimized root entrypoint while keeping the legacy Lightning UI intact.
- Added a 30-second server-side game-enabled cache to avoid a Supabase round-trip on every isolated game load.
- Fixed a critical home-page CPU loop: the compatibility MutationObserver callback called `renderCatalog()`, while `renderCatalog()` mutated the observed DOM with `innerHTML`/button insertion. This recursively retriggered the observer and could drive the Worker/WebView into excessive work and contribute to 1101/slow loading symptoms.
- The home observer now only scans Lightning result changes; catalog rendering is performed once and is no longer called from the observer callback.
- Corrected Focus Ribbon semantics: only ◆ is a target; ● and ★ are always non-targets, with misses and false presses scored separately.
- Corrected Switcher rule display and scoring; matching stimuli are hits, non-matching stimuli are correct rejections when ignored, and presses on non-matching stimuli are errors.
- Replaced Memory Grid with an isolated implementation using an explicit exact-order rule: the player must reproduce the displayed sequence in order; the first wrong cell ends the round and is counted as an error.
- Fixed Focus Ribbon and Switcher session duration to measure the complete session rather than only the final round.
- All game result submissions use the existing authenticated `/api/game-sessions` contract.

## Current main commit
- `15a326cc53927e75d87c4b6fa1c14a6b3e6b72a4` — stop recursive home observer causing Worker overload.

## Verification
- `root_entry.js` was changed without modifying the protected legacy `worker.js`; no legacy backup was required.
- Supabase persistence remains unchanged and was previously verified with a transactional `record_game_session` test, followed by cleanup.
- Repository syntax validation is configured through GitHub Actions; a fresh run is triggered by this commit.

## Acceptance gate
**Code fix: COMPLETE.** The identified recursive DOM-observer loop is removed from the current `main` code.

**Production smoke test: NOT VERIFIED.** The available environment cannot execute the Telegram WebView against the live Cloudflare Worker or inspect Cloudflare deployment logs. Therefore this fix is not declared production-verified or production-ready until the live deployment is opened in Telegram and tested.

## Immediate smoke path
1. Open Mini App.
2. Confirm initial screen loads without prolonged spinner/freeze.
3. Confirm exactly one catalog and one Progress button.
4. Play Lightning and confirm the result appears without UI lock-up.
5. Open Progress and confirm no 1101.
6. Complete Memory Grid, Switcher and Focus Ribbon; confirm each result returns and persists.
7. Close/reopen the Mini App and confirm progress remains.
