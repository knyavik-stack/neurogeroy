## 2026-09-03 — Memory Grid production route

- Added `GET /games/memory-grid` to `worker_entry.js`.
- Route is isolated from legacy Lightning `worker.js`.
- Memory Grid submits results directly to `POST /api/game-sessions`.
- Existing Lightning HTML and gameplay were not modified.
- Navigation exposure remains deferred until route-level deployment verification.
