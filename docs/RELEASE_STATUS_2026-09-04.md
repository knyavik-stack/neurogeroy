# Release status — 2026-09-04

## Stabilization stage
- Fixed the Cloudflare JavaScript parsing failure in the Progress implementation.
- Restored the player progress route with player level, XP, coins, per-game metrics, achievements and daily quests.
- Removed the legacy home-page MutationObserver/catalog injection from the production response path; this was the source of repeated menu injection and unnecessary DOM work.
- Added an optimized root entrypoint that keeps the legacy Lightning UI intact while serving the corrected isolated game modules.
- Corrected Focus Ribbon semantics: only ◆ is a target; ● and ★ are always non-targets, with misses and false presses scored separately.
- Corrected Switcher rule display and scoring; matching stimuli are hits, non-matching stimuli are correct rejections when ignored, and presses on non-matching stimuli are errors.
- All game result submissions use the existing authenticated `/api/game-sessions` contract.

## Deployment commits
- Progress route restoration: `42ceb37fdb38f4460ca42c81306ea1c6b14f97c9`
- Optimized root entrypoint: `b4be1fdcd4db179e7741cb4efe508adb489095e0`
- Corrected Focus Ribbon module: `f41849aa42672665cfbc51851df2652416ef0f81`
- Corrected Switcher module: `289d06fef4637d73b63b0df34e3df989030db314`

## Acceptance gate
The implementation is code-complete for this stabilization pass. Final production readiness requires one real Telegram smoke test after Cloudflare deploy: reopen the Mini App twice, confirm exactly one copy of the four game entries plus Progress, exercise each game, confirm result scoring, return to menu, open Progress and confirm the completed session appears. Cloudflare build logs are not exposed through the current tool connection, so this final production assertion cannot be truthfully marked passed from repository inspection alone.
