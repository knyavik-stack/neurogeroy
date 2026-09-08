# Backup: worker.js legacy entrypoint

Перед заменой `worker.js` сохранён в Git history.

- Original blob SHA: `18f1d1101609aa4ee9e5fb6e21c28e4facd4a173`
- Original commit before replacement: `4f8404a25e8c07bf92dee4d9883fee3b4f3e4089` is the last pre-replacement project state in this repair sequence.
- The immutable original file remains recoverable from GitHub history by blob SHA above.
- Reason for replacement: production behavior observed by the user matched the legacy `worker.js` entrypoint: only Lightning was served at `/`, while the canonical multi-game app lived in `root_entry.js`. The new `worker.js` is a compatibility entrypoint that delegates to the canonical app.
