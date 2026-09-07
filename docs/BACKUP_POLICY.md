# Backup Policy

Before any structural change to Cloudflare Worker entry code, preserve the exact current version in a dated git backup/tag/file.

## Current baseline
- `worker.js` is the protected legacy Lightning implementation and must not be overwritten without a fresh backup of the exact current blob.
- `worker_entry.js` is now a small integration layer containing only the normalized `/api/game-sessions` endpoint and importing Telegram validation from `telegram_auth.js`.
- `backup_worker.js` is the retained immutable copy of the legacy `worker.js` baseline from the previous structural pass.
- `backups/2026-09-03/worker_entry.BACKUP.js` preserves the earlier worker entrypoint before the v2 routing cleanup.

No future deployment may replace the protected Lightning implementation with an unreviewed rewrite.