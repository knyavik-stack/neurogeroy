import legacy from "./backup_worker.js";

const MAX_AUTH_AGE_SECONDS = 3600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/game-sessions/lightning") {
      try {
        const body = await request.json();
        const auth = await validateTelegramInitData(body?.initData, env.TELEGRAM_BOT_TOKEN);
        if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

        const reactionMs = Number(body?.reaction_ms);
        const difficulty = Number(body?.difficulty ?? 1);
        const falseStarts = Number(body?.false_starts ?? 0);
        if (!Number.isInteger(reactionMs) || reactionMs < 1 || reactionMs > 10000) return json({ ok: false, error: "Invalid reaction" }, 400);
        if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) return json({ ok: false, error: "Invalid difficulty" }, 400);
        if (!Number.isInteger(falseStarts) || falseStarts < 0 || falseStarts > 20) return json({ ok: false, error: "Invalid false starts" }, 400);

        const key = env.SUPABASE_SECRET_KEY;
        if (!env.SUPABASE_URL || !key) return json({ ok: false, error: "Server storage configuration error" }, 500);

        const rpc = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/record_lightning_session`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({
            p_telegram_id: auth.user.id,
            p_first_name: auth.user.first_name,
            p_username: auth.user.username,
            p_reaction_ms: reactionMs,
            p_difficulty: difficulty,
            p_false_starts: falseStarts,
          }),
        });

        const text = await rpc.text();
        if (!rpc.ok) return json({ ok: false, error: "Could not save game result" }, 502);
        let result;
        try { result = JSON.parse(text); } catch { result = {}; }
        return json({ ok: true, ...result });
      } catch {
        return json({ ok: false, error: "Could not save game result" }, 500);
      }
    }

    const response = await legacy.fetch(request, env, ctx);
    if (request.method === "GET" && url.pathname === "/" && response.ok) {
      const html = await response.text();
      const injected = `
<script>
(() => {
  let lastSavedReaction = null;
  const save = async (reactionMs) => {
    if (!Number.isInteger(reactionMs) || reactionMs < 1 || reactionMs > 10000 || reactionMs === lastSavedReaction) return;
    lastSavedReaction = reactionMs;
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;
    try {
      await fetch('/api/game-sessions/lightning', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData, reaction_ms: reactionMs, difficulty: 1, false_starts: 0 }) });
    } catch (_) {}
  };
  const scan = () => {
    const h1 = document.querySelector('h1');
    if (!h1) return;
    const m = h1.textContent.match(/^(\d+)\s*мс$/);
    if (m) save(Number(m[1]));
  };
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
</script>`;
      return new Response(html.replace("</body>", injected + "\n</body>"), response);
    }
    return response;
  },
};

async function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return { ok: false, error: "Missing Telegram authorization" };
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userRaw = params.get("user");
  if (!receivedHash || !authDate || !userRaw) return { ok: false, error: "Invalid Telegram initData" };
  const now = Math.floor(Date.now() / 1000);
  if (authDate > now + 60 || now - authDate > MAX_AUTH_AGE_SECONDS) return { ok: false, error: "Telegram authorization expired" };
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), new TextEncoder().encode(botToken));
  const calculated = toHex(await hmac(secret, new TextEncoder().encode(dataCheckString)));
  if (!constantTimeEqual(calculated, receivedHash)) return { ok: false, error: "Invalid Telegram signature" };
  let user;
  try { user = JSON.parse(userRaw); } catch { return { ok: false, error: "Invalid Telegram user" }; }
  if (!user?.id) return { ok: false, error: "Telegram user not found" };
  return { ok: true, user: { id: user.id, first_name: user.first_name ?? null, username: user.username ?? null } };
}

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, data);
}
function toHex(buffer) { return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join(""); }
function constantTimeEqual(a, b) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } }); }
