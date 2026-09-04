# Release status — 2026-09-04

## Stabilization stage
- Replaced the nested Progress entrypoint chain with a direct root route to remove the failing Progress execution path associated with Cloudflare 1101.
- Restored the player progress route with player level, XP, coins, per-game metrics, achievements and daily quests.
- Removed the legacy home-page MutationObserver/catalog injection from the production response path; the root entrypoint strips it before returning the page and installs one lightweight menu.
- Added an optimized root entrypoint while keeping the legacy Lightning UI intact.
- Added a 30-second server-side game-enabled cache to avoid a Supabase round-trip on every isolated game load.
- Corrected Focus Ribbon semantics: only ◆ is a target; ● and ★ are always non-targets, with misses and false presses scored separately.
- Corrected Switcher rule display and scoring; matching stimuli are hits, non-matching stimuli are correct rejections when ignored, and presses on non-matching stimuli are errors.
- Replaced Memory Grid with an isolated implementation using an explicit exact-order rule: the player must reproduce the displayed sequence in order; the first wrong cell ends the round and is counted as an error.
- Fixed Focus Ribbon and Switcher session duration to measure the complete session rather than only the final round.
- All game result submissions use the existing authenticated `/api/game-sessions` contract.

## Actual commits in main
- `69daa5efc5c9a09a5597599e290bf69c87b9be1f` — simplified Worker entrypoint and removed Progress 1101 path.
- `61112694e020fda709467feb2b064b006eb4ede0` — full-session duration for Focus Ribbon.
- `d26b24fd767b79e799e47e826db07709b504772b` — full-session duration for Switcher.
- `2c1b49b0f49117eaf30656cae439977f3c97aa5e` — isolated Memory Grid v2.
- `915c522b871a141ddb9b3807391089e079d7b3c8` — activated Memory Grid v2 from the root entrypoint; current main HEAD.

## Acceptance gate
**Code stabilization: READY.** The repository now contains the direct Progress path, corrected game mechanics/scoring and reduced avoidable request/DOM overhead.

**Production smoke test: not verifiable from the current tool connection.** GitHub reports no CI status for the current commit, and Cloudflare build/deployment logs are not exposed through the available connection. A real Telegram reopen/test is still required to prove that Cloudflare has deployed `915c522b871a141ddb9b3807391089e079d7b3c8`.
