# Backup Policy

Before any structural change to Cloudflare Worker entry code, preserve the exact current version in a dated Git tag or immutable backup branch/file.

## Current baseline
- `worker.js` is the 769-line legacy Lightning UI and must not be overwritten.
- `worker_entry.js` is a 70-line integration/router layer; it is intentionally smaller because it imports and delegates to `worker.js`.

No future deployment may replace the Lightning UI with a shortened entrypoint.