const MAX_AUTH_AGE_SECONDS = 3600;
const SUPABASE_TABLE_URL = (env) => `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { "access-control-allow-origin": "https://neurogeroy.ru" };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { ...cors, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" } });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok", service: "NeuroGeroy", timestamp: new Date().toISOString() }, 200, cors);
    }

    if (request.method === "POST" && url.pathname === "/api/auth/telegram") {
      try {
        const { initData } = await request.json();
        const auth = await validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
        if (!auth.ok) return json({ ok: false, error: auth.error }, 401, cors);
        const player = await upsertPlayer(env, auth.user);
        return json({ ok: true, user: auth.user, player }, 200, cors);
      } catch (e) {
        return json({ ok: false, error: "Authentication failed" }, 400, cors);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/game-sessions/lightning") {
      try {
        const body = await request.json();
        const auth = await validateTelegramInitData(body.initData, env.TELEGRAM_BOT_TOKEN);
        if (!auth.ok) return json({ ok: false, error: auth.error }, 401, cors);
        const reactionMs = Number(body.reaction_ms);
        const difficulty = Number(body.difficulty ?? 1);
        const falseStarts = Number(body.false_starts ?? 0);
        if (!Number.isInteger(reactionMs) || reactionMs < 1 || reactionMs > 10000) return json({ ok: false, error: "Invalid reaction" }, 400, cors);
        if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) return json({ ok: false, error: "Invalid difficulty" }, 400, cors);
        if (!Number.isInteger(falseStarts) || falseStarts < 0 || falseStarts > 20) return json({ ok: false, error: "Invalid false starts" }, 400, cors);
        const result = await recordLightning(env, auth.user, reactionMs, difficulty, falseStarts);
        return json({ ok: true, ...result }, 200, cors);
      } catch (e) {
        return json({ ok: false, error: "Could not save game result" }, 500, cors);
      }
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML, { headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", ...cors } });
    }

    return json({ ok: false, error: "Not found" }, 404, cors);
  }
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
  return { ok: true, authDate, user: { id: user.id, first_name: user.first_name ?? null, last_name: user.last_name ?? null, username: user.username ?? null, language_code: user.language_code ?? null } };
}

async function upsertPlayer(env, user) {
  const response = await fetch(`${SUPABASE_TABLE_URL(env)}/players?on_conflict=telegram_id`, {
    method: "POST",
    headers: supabaseHeaders(env, { "Prefer": "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify({ telegram_id: user.id, first_name: user.first_name, username: user.username, last_seen_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error(`Supabase players ${response.status}`);
  const rows = await response.json();
  return rows[0] ?? null;
}

async function recordLightning(env, user, reactionMs, difficulty, falseStarts) {
  const response = await fetch(`${SUPABASE_TABLE_URL(env)}/rpc/record_lightning_session`, {
    method: "POST",
    headers: supabaseHeaders(env, { "Prefer": "return=representation" }),
    body: JSON.stringify({ p_telegram_id: user.id, p_first_name: user.first_name, p_username: user.username, p_reaction_ms: reactionMs, p_difficulty: difficulty, p_false_starts: falseStarts })
  });
  if (!response.ok) throw new Error(`Supabase RPC ${response.status}`);
  return await response.json();
}

function supabaseHeaders(env, extra = {}) {
  const key = env.SUPABASE_SECRET_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, data);
}
function toHex(buffer) { return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join(""); }
function constantTimeEqual(a, b) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers } }); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }

const HTML = `
<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="https://telegram.org/js/telegram-web-app.js"></script><title>NeuroGeroy</title>
<style>
:root{--bg:#101322;--text:#fff;--muted:#b9c0dc}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:Inter,Arial,sans-serif}body{touch-action:manipulation}#app{min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(100%,520px);min-height:380px;padding:30px;border-radius:30px;background:linear-gradient(145deg,#1d233b,#111524);box-shadow:0 24px 80px rgba(0,0,0,.35);text-align:center}.eyebrow{font-size:12px;letter-spacing:.14em;opacity:.65;font-weight:700}h1{margin:22px 0 14px;font-size:clamp(34px,10vw,52px);line-height:1.02}p{color:var(--muted);font-size:17px;line-height:1.5}button{width:100%;margin-top:14px;border:0;border-radius:18px;padding:18px 20px;font-size:17px;font-weight:800;cursor:pointer}.secondary{background:transparent;border:1px solid rgba(255,255,255,.2);color:#fff}.best{margin:20px 0;padding:14px;border-radius:16px;background:rgba(255,255,255,.07)}.game{min-height:100vh;width:100%;display:grid;place-items:center;cursor:pointer;user-select:none}.waiting{background:#101322}.lightning{background:#26304c}.game-card{text-align:center}.bolt{font-size:110px;animation:pulse .35s infinite alternate}@keyframes pulse{from{transform:scale(.9)}to{transform:scale(1.12)}}.warning{color:#ffd37a}.small{margin-top:20px;font-size:12px;opacity:.5}.status{margin-top:12px;font-size:12px;opacity:.55}
</style></head><body><div id="app"></div><script>
const app=document.getElementById("app"),MIN_WAIT=1200,MAX_WAIT=3500,STORAGE_KEY="neurogeroy.lightning.bestReactionMs";let phase="home",timer=null,signalAt=null,lastReaction=null,best=Number(localStorage.getItem(STORAGE_KEY))||null,authUser=null,difficulty=1,falseStarts=0;
function haptic(type="light"){try{const tg=window.Telegram?.WebApp;if(!tg?.HapticFeedback)return;if(type==="success")tg.HapticFeedback.notificationOccurred("success");else if(type==="error")tg.HapticFeedback.notificationOccurred("error");else tg.HapticFeedback.impactOccurred(type)}catch(_){} }
function telegramInit(){try{const tg=window.Telegram?.WebApp;if(tg){tg.ready();tg.expand()}}catch(_){} }
function localName(){return authUser?.first_name||window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name||"Герой"}
async function authenticate(){const initData=window.Telegram?.WebApp?.initData;if(!initData)return;try{const r=await fetch("/api/auth/telegram",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData})});const d=await r.json();if(r.ok&&d.ok){authUser=d.user;render()}else console.warn(d.error)}catch(e){console.warn(e)}}
async function saveResult(){const initData=window.Telegram?.WebApp?.initData;if(!initData)return{ok:false,error:"Telegram authorization unavailable"};try{const r=await fetch("/api/game-sessions/lightning",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,reaction_ms:lastReaction,difficulty,false_starts:falseStarts})});const d=await r.json();return{...d,httpOk:r.ok}}catch(e){return{ok:false,error:"Network error"}}}
function render(){
if(phase==="home"){app.innerHTML='<section class="card"><div class="eyebrow">NEUROGEROY · ПЕРВАЯ МИССИЯ</div><h1>Привет, '+escapeHtml(localName())+'!</h1><p>Добро пожаловать в NeuroGeroy. Твоя первая миссия проверит скорость реакции.</p>'+(best?'<div class="best">🏆 Лучший результат<br><strong>'+best+' мс</strong></div>':'')+'<button id="start">⚡ Открыть «Молнию»</button><div class="status">'+(authUser?'✓ Telegram подтверждён сервером':'')+'</div><div class="small">NeuroGeroy · cognitive game prototype</div></section>';document.getElementById("start").onclick=()=>{haptic();phase="intro";render()};return}
if(phase==="intro"){app.innerHTML='<section class="card"><div class="eyebrow">МИССИЯ · МОЛНИЯ</div><h1>Нажми только после ⚡</h1><p>Подожди появления молнии. Как только увидишь сигнал — нажми как можно быстрее.</p><p class="warning">Не нажимай раньше времени.</p><button id="ready">Я готов</button><button id="back" class="secondary">Назад</button></section>';document.getElementById("ready").onclick=startRound;document.getElementById("back").onclick=()=>{phase="home";render()};return}
if(phase==="waiting"){app.innerHTML='<div class="game waiting" id="game"><div class="game-card"><div class="eyebrow">ЖДИ СИГНАЛ</div><h1>...</h1><p>Не нажимай раньше времени</p></div></div>';document.getElementById("game").onpointerdown=falseStart;return}
if(phase==="lightning"){app.innerHTML='<div class="game lightning" id="game"><div class="game-card"><div class="bolt">⚡</div><h1>ЖМИ!</h1></div></div>';document.getElementById("game").onpointerdown=reactionClick;return}
if(phase==="result"){app.innerHTML='<section class="card"><div class="eyebrow">РЕЗУЛЬТАТ</div><h1>'+lastReaction+' мс</h1><p id="message">'+(lastReaction<250?'Невероятная реакция!':lastReaction<400?'Отличная скорость!':'Хорошая попытка! Можно ещё быстрее.')+'</p><div class="best">🏆 Твой рекорд: <strong>'+best+' мс</strong></div><div id="saveStatus" class="status">Сохраняем результат…</div><button id="again">⚡ Ещё раз</button><button id="home" class="secondary">К миссиям</button></section>';document.getElementById("again").onclick=startRound;document.getElementById("home").onclick=()=>{phase="home";render()};saveResult().then(d=>{const s=document.getElementById("saveStatus");if(s)s.textContent=d.ok?'✓ Результат сохранён':'Не удалось сохранить результат';if(d.ok&&d.coins_earned!==undefined){const m=document.getElementById("message");if(m)m.textContent+='  +'+d.experience_earned+' опыта · +'+d.coins_earned+' монет';}})}}
function startRound(){clearTimeout(timer);signalAt=null;haptic();phase="waiting";render();timer=setTimeout(()=>{signalAt=performance.now();phase="lightning";haptic("medium");render()},MIN_WAIT+Math.random()*(MAX_WAIT-MIN_WAIT))}
function falseStart(){clearTimeout(timer);signalAt=null;falseStarts++;haptic("error");phase="intro";render()}
function reactionClick(){if(!signalAt)return;lastReaction=Math.max(1,Math.round(performance.now()-signalAt));if(!best||lastReaction<best){best=lastReaction;localStorage.setItem(STORAGE_KEY,String(best))}haptic("success");phase="result";render()}
telegramInit();render();authenticate();
</script></body></html>`;
