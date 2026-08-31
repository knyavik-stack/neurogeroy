# NeuroGeroy Mini App

## Current status

The first playable vertical slice is live at the project domain through Cloudflare Worker:
- Home screen
- «Молния» reaction game
- random signal delay
- false-start handling
- reaction measurement
- local best-score fallback
- Telegram WebApp lifecycle and haptic feedback when opened inside Telegram

## Production architecture target

Frontend source remains React + TypeScript + Vite.

Runtime architecture:

```
Telegram Bot → HTTPS Mini App → /api/auth/telegram → validated user → Supabase
                                      ↓
                                game sessions
```

## Security boundary

Telegram `initDataUnsafe` is display-only and must never authorize a user.
The original signed `initData` must be sent to a server endpoint and validated there using the Bot Token kept only as a Worker secret.

## Next acceptance gate

1. Open the Mini App from the actual NeuroGeroy Telegram bot.
2. Verify Telegram WebApp lifecycle and user context.
3. Add server-side initData validation.
4. Add persistent game sessions.

Do not merge Phase 0 to main until the end-to-end Telegram test passes.
