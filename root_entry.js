import app from "./worker_entry.js";
import legacy from "./worker.js";
import { validateTelegram } from "./telegram_auth.js";
import { renderProgressPage } from "./progress_page.js";
import { renderMemoryGridHtml } from "./games/memory_grid_v2.js";
import { renderFocusRibbonHtml } from "./games/focus_ribbon_v2.js";
import { renderSwitcherHtml } from "./games/switcher_v2.js";

const CATALOG = [
  { code: "lightning", title: "Молния", skill: "Скорость реакции", icon: "⚡", route: "/games/lightning", tone: "cyan", desc: "Лови сигнал быстрее всех." },
  { code: "memory_grid", title: "Память-сетка", skill: "Рабочая память", icon: "🧠", route: "/games/memory-grid", tone: "violet", desc: "Запоминай последовательности." },
  { code: "switcher", title: "Переключатель", skill: "Когнитивная гибкость", icon: "🔄", route: "/games/switcher", tone: "orange", desc: "Меняй правило на лету." },
  { code: "focus_ribbon", title: "Фокус-лента", skill: "Устойчивое внимание", icon: "🎯", route: "/games/focus-ribbon", tone: "blue", desc: "Держи внимание до финиша." }
];

const TG_BOOTSTRAP = `<script>(()=>{if(window.__TG_READY)return;window.__TG_READY=new Promise(resolve=>{const ready=()=>{try{const tg=window.Telegram?.WebApp;if(tg){tg.ready();tg.expand()}resolve(tg||null)}catch(_){resolve(null)}};if(window.Telegram?.WebApp){ready();return}const s=document.createElement("script");s.src="https://telegram.org/js/telegram-web-app.js";s.async=true;s.onload=ready;s.onerror=()=>resolve(null);document.head.appendChild(s)});window.getTelegram=()=>window.Telegram?.WebApp||null})()</script>`;

export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);

    if (request.method === "GET" && u.pathname === "/") {
      return new Response(enhanceHtml(menuHtml()), { headers: htmlHeaders() });
    }

    if (request.method === "GET" && u.pathname === "/games/lightning") {
      const target = new URL(request.url);
      target.pathname = "/";
      const legacyRequest = new Request(target, request);
      const response = await legacy.fetch(legacyRequest, env, ctx);
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return response;
      let html = await response.text();
      const script = `<script>(()=>{let saved=false,falseStarts=0;const original=window.falseStart;if(typeof original==="function")window.falseStart=function(...a){falseStarts++;return original.apply(this,a)};const save=async ms=>{if(saved||!Number.isInteger(ms)||ms<1||ms>60000)return;saved=true;const initData=window.getTelegram?.()?.initData;if(!initData){saved=false;return}try{const r=await fetch("/api/game-sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,game_code:"lightning",score:Math.max(0,1000-ms),difficulty:1,reaction_ms:ms,false_starts:falseStarts,accuracy_percent:falseStarts?0:100,duration_ms:ms,error_count:falseStarts,metadata:{legacy_bridge:true}})});if(!r.ok)saved=false}catch(_){saved=false}};const scan=()=>{const h=document.querySelector("h1");const m=h?.textContent.match(/^(\\d+)\\s*мс$/);if(m)save(Number(m[1]))};const root=document.getElementById("app")||document.body;new MutationObserver(scan).observe(root,{childList:true,subtree:true});scan()})()</script>`;
      const headers = new Headers(response.headers);
      headers.set("cache-control", "no-store");
      return new Response(enhanceHtml(html.replace("</body>", script + "</body>")), { status: response.status, headers });
    }

    if (request.method === "GET" && u.pathname === "/progress") {
      return new Response(enhanceHtml(renderProgressPage()), { headers: htmlHeaders() });
    }

    if (request.method === "GET" && u.pathname === "/api/progress") {
      return progressApi(request, env);
    }

    if (request.method === "GET" && (u.pathname === "/games/memory-grid" || u.pathname === "/games/focus-ribbon" || u.pathname === "/games/switcher")) {
      const code = u.pathname.endsWith("memory-grid") ? "memory_grid" : u.pathname.endsWith("focus-ribbon") ? "focus_ribbon" : "switcher";
      const html = code === "memory_grid" ? renderMemoryGridHtml() : code === "focus_ribbon" ? renderFocusRibbonHtml() : renderSwitcherHtml();
      return new Response(enhanceHtml(html), { headers: htmlHeaders() });
    }

    return app.fetch(request, env, ctx);
  }
};

function enhanceHtml(html) {
  const cleaned = html.replace(/<script[^>]+src=["']https:\/\/telegram\.org\/js\/telegram-web-app\.js["'][^>]*><\/script>/gi, TG_BOOTSTRAP);
  const guard = `<script>(()=>{const nativeFetch=window.fetch.bind(window);const show=()=>{if(document.getElementById("save-error"))return;const box=document.createElement("div");box.id="save-error";box.style="position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;padding:14px 16px;border-radius:18px;background:linear-gradient(135deg,#17213a,#27182c);color:#fff;font:700 15px Arial,sans-serif;box-shadow:0 16px 45px #0009;text-align:center;border:1px solid #ffffff20";box.innerHTML="Не удалось сохранить результат.<br><button id=\"save-retry\" style=\"margin-top:10px;padding:10px 16px;border-radius:12px;border:0;font-weight:800;cursor:pointer\">Повторить</button>";document.body.appendChild(box);box.querySelector("#save-retry").onclick=()=>location.reload()};window.fetch=async(...args)=>{try{const r=await nativeFetch(...args);const input=args[0],url=typeof input==="string"?input:input?.url||"",method=(args[1]?.method||input?.method||"GET").toUpperCase();if(method==="POST"&&url.includes("/api/game-sessions")&&!r.ok)show();return r}catch(e){const input=args[0],url=typeof input==="string"?input:input?.url||"",method=(args[1]?.method||input?.method||"GET").toUpperCase();if(method==="POST"&&url.includes("/api/game-sessions"))show();throw e}}})()</script>`;
  return cleaned.replace("</body>", guard + "</body>");
}

function menuHtml() {
  const cards = CATALOG.map(g => `<button class="game-card ${g.tone}" data-route="${g.route}"><span class="game-icon">${g.icon}</span><span class="game-copy"><b>${esc(g.title)}</b><small>${esc(g.skill)}</small><em>${esc(g.desc)}</em></span><span class="arrow">›</span></button>`).join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07101d"><title>НейроГерой</title><style>
:root{--bg:#07101d;--panel:#101d2d;--panel2:#13263a;--text:#f7fbff;--muted:#9eb2c7;--cyan:#23e6ff;--violet:#9a63ff;--orange:#ff8a25;--line:#ffffff18}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html{background:var(--bg)}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% -10%,#173b58 0,#0b1726 35%,#07101d 72%);color:var(--text);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation}body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.32;background:radial-gradient(circle at 15% 25%,#13dfff18 0 1px,transparent 2px),radial-gradient(circle at 80% 45%,#9b5cff16 0 1px,transparent 2px);background-size:42px 42px,57px 57px}.wrap{width:min(100%,620px);margin:auto;padding:calc(14px + env(safe-area-inset-top)) 16px calc(26px + env(safe-area-inset-bottom))}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.brand{font-weight:900;font-size:20px;letter-spacing:-.04em}.brand i{font-style:normal;color:var(--cyan)}.status{display:flex;gap:7px;align-items:center;padding:7px 10px;border:1px solid var(--line);background:#ffffff08;border-radius:999px;color:#d7e7f5;font-size:12px;font-weight:800}.dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan)}.hero{position:relative;overflow:hidden;border:1px solid #22dffb55;border-radius:28px;padding:20px;background:linear-gradient(145deg,#102a3b,#101827 58%,#17152d);box-shadow:0 18px 55px #0008}.hero:after{content:"";position:absolute;width:210px;height:210px;right:-90px;top:-90px;border-radius:50%;background:#8d4cff22;filter:blur(6px)}.hero-grid{display:grid;grid-template-columns:1fr 130px;gap:10px;align-items:center}.eyebrow{font-size:11px;letter-spacing:.15em;color:#7cecff;font-weight:900}.hero h1{font-size:clamp(30px,8vw,42px);line-height:1;margin:8px 0}.hero p{margin:0;color:var(--muted);line-height:1.4}.avatar{position:relative;width:126px;height:146px;display:grid;place-items:center}.avatar:before{content:"";position:absolute;width:112px;height:112px;border-radius:50%;background:radial-gradient(circle,#1fe9ff55,#8e4dff18 55%,transparent 70%);box-shadow:0 0 40px #18dfff33}.avatar-core{position:relative;width:76px;height:96px;border-radius:42% 42% 35% 35%;background:linear-gradient(160deg,#1a63c9,#081c42 62%,#5121a5);border:2px solid #2ce8ff;box-shadow:0 0 25px #1edfff77}.avatar-core:before{content:"";position:absolute;width:45px;height:38px;left:13px;top:-14px;border-radius:50% 50% 42% 42%;background:linear-gradient(145deg,#e7a276,#713b34);border:3px solid #0a1630}.avatar-core:after{content:"✦";position:absolute;right:-10px;bottom:8px;color:#ff8a25;font-size:27px;text-shadow:0 0 12px #ff8a25}.identity{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.identity-card{padding:12px;border-radius:16px;background:#ffffff08;border:1px solid var(--line)}.identity-card b{display:block;font-size:13px}.identity-card small{display:block;color:var(--muted);margin-top:3px}.section-head{display:flex;align-items:end;justify-content:space-between;margin:22px 2px 10px}.section-head h2{margin:0;font-size:20px}.section-head span{font-size:12px;color:var(--muted)}.games{display:grid;gap:10px}.game-card{width:100%;display:grid;grid-template-columns:50px 1fr 20px;gap:12px;align-items:center;text-align:left;padding:13px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,#132438,#0e1927);color:var(--text);cursor:pointer;transition:transform .12s,border-color .12s,background .12s}.game-card:active{transform:scale(.985)}.game-card:hover{border-color:#ffffff38}.game-icon{width:50px;height:50px;display:grid;place-items:center;border-radius:16px;background:#ffffff0b;font-size:27px}.game-copy b{display:block;font-size:16px}.game-copy small{display:block;color:#7fe9ff;font-weight:800;font-size:11px;margin-top:3px}.game-copy em{display:block;color:var(--muted);font-style:normal;font-size:12px;margin-top:3px}.arrow{font-size:30px;color:#7990a5}.cyan .game-icon{box-shadow:inset 0 0 0 1px #23e6ff55}.violet .game-icon{box-shadow:inset 0 0 0 1px #9a63ff55}.orange .game-icon{box-shadow:inset 0 0 0 1px #ff8a2555}.blue .game-icon{box-shadow:inset 0 0 0 1px #4d9cff55}.progress{width:100%;margin-top:12px;padding:15px;border:1px solid #ffffff24;border-radius:18px;background:#ffffff08;color:#fff;font-weight:900;font-size:15px;cursor:pointer}.footer{margin-top:16px;text-align:center;color:#667d91;font-size:11px}.pulse{animation:pulse 1.8s ease-in-out infinite}@keyframes pulse{50%{box-shadow:0 0 0 6px #23e6ff08,0 0 28px #23e6ff22}}
</style></head><body><main class="wrap"><header class="top"><div class="brand">Нейро<span style="color:var(--cyan)">Герой</span></div><div class="status"><i class="dot"></i><span id="tg-status">Telegram</span></div></header><section class="hero"><div class="hero-grid"><div><div class="eyebrow">КТО Я</div><h1 id="hello">Привет, Герой!</h1><p>Ты — Нейрогерой. Выбирай игру, прокачивай сильные стороны и ставь личные рекорды.</p></div><div class="avatar pulse"><div class="avatar-core"></div></div></div><div class="identity"><div class="identity-card"><b>🎮 Сегодня</b><small>Твоя тренировка начинается здесь</small></div><div class="identity-card"><b>🧠 Что прокачиваем</b><small>Память · внимание · реакцию</small></div></div></section><div class="section-head"><h2>ВО ЧТО ИГРАТЬ</h2><span>40–90 сек</span></div><section class="games">${cards}</section><button class="progress" id="progress">📈 Мой прогресс и достижения</button><div class="footer">Игра всегда на первом месте · Никаких обязательных заданий</div></main><script>(()=>{const tg=()=>window.getTelegram?.()||window.Telegram?.WebApp;const boot=()=>{const t=tg();try{t?.ready();t?.expand()}catch(_){}const u=t?.initDataUnsafe?.user;if(u?.first_name)document.getElementById("hello").textContent="Привет, "+u.first_name+"!";if(u)document.getElementById("tg-status").textContent="Онлайн"};window.__TG_READY?.then(boot);setTimeout(boot,700);document.querySelectorAll(".game-card").forEach(b=>b.addEventListener("click",()=>{const r=b.dataset.route;if(r)window.location.href=r}));document.getElementById("progress").addEventListener("click",()=>window.location.href="/progress")})()</script></body></html>`;
}

function esc(x) { return String(x ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m])); }

async function progressApi(request, env) {
  const a = await validateTelegram(request.headers.get("x-telegram-init-data"), env.TELEGRAM_BOT_TOKEN);
  if (!a.ok) return json({ ok: false, error: a.error }, 401);
  const key = env.SUPABASE_SECRET_KEY;
  if (!env.SUPABASE_URL || !key) return json({ ok: false, error: "Server storage configuration error" }, 500);
  const base = env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/", h = { apikey: key, Authorization: "Bearer " + key };
  try {
    const p = await one(base + "players?select=id,first_name,character_name,level,experience,coins&telegram_id=eq." + encodeURIComponent(a.user.id) + "&limit=1", h);
    if (!p) return json({ ok: true, player: { first_name: a.user.first_name || "Герой", character_name: "Нейрогерой", level: 1, experience: 0, coins: 0 }, skills: [], achievements: emptyAchievements(), quests: emptyQuests() });
    const [st, games, sessions] = await Promise.all([
      rows(base + "player_game_stats?select=game_code,sessions_count,best_score,best_accuracy_percent&player_id=eq." + p.id, h),
      rows(base + "games?select=code,title,skill_domain&enabled=eq.true&order=sort_order.asc,code.asc", h),
      rows(base + "game_sessions?select=game_code,score,accuracy_percent,created_at&player_id=eq." + p.id + "&order=created_at.desc&limit=500", h)
    ]);
    const by = Object.fromEntries(st.map(x => [x.game_code, x])), all = Array.isArray(sessions) ? sessions : [], today = new Date().toISOString().slice(0, 10), todayRows = all.filter(x => String(x.created_at || "").slice(0, 10) === today), labels = { reaction: "Скорость реакции", working_memory: "Рабочая память", cognitive_flexibility: "Когнитивная гибкость", sustained_attention: "Устойчивое внимание" };
    const skills = games.map(g => { const s = by[g.code] || {}; return { code: g.code, title: g.title, skill_title: labels[g.skill_domain] || g.title, sessions: Number(s.sessions_count || 0), best_score: s.best_score == null ? null : Number(s.best_score), accuracy: s.best_accuracy_percent == null ? null : Math.round(Number(s.best_accuracy_percent)) }; });
    const total = all.length, distinct = new Set(all.map(x => x.game_code)).size, scoreToday = todayRows.reduce((n, x) => n + (Number(x.score) || 0), 0), high = all.some(x => Number(x.accuracy_percent) >= 90);
    return json({ ok: true, player: { first_name: p.first_name || a.user.first_name || "Герой", character_name: p.character_name || "Нейрогерой", level: Number(p.level || 1), experience: Number(p.experience || 0), coins: Number(p.coins || 0) }, skills, achievements: [{ title: "Первый шаг", text: "Сыграй первую тренировку", done: total > 0, progress: Math.min(total, 1), goal: 1 }, { title: "Разминка", text: "Сыграй 3 тренировки", done: total >= 3, progress: Math.min(total, 3), goal: 3 }, { title: "Точный прицел", text: "Точность 90%+", done: high, progress: high ? 1 : 0, goal: 1 }, { title: "Мастер тренировок", text: "Сыграй 10 тренировок", done: total >= 10, progress: Math.min(total, 10), goal: 10 }, { title: "Исследователь", text: "Попробуй 4 игры", done: distinct >= 4, progress: Math.min(distinct, 4), goal: 4 }], quests: [{ title: "Две тренировки", text: "Сыграй 2 раза сегодня", progress: Math.min(todayRows.length, 2), goal: 2, reward: 20 }, { title: "Набор очков", text: "Набери 500 очков сегодня", progress: Math.min(Math.round(scoreToday), 500), goal: 500, reward: 30 }, { title: "Чистая серия", text: "2 тренировки с точностью 80%+", progress: Math.min(todayRows.filter(x => Number(x.accuracy_percent) >= 80).length, 2), goal: 2, reward: 30 }] });
  } catch (_) { return json({ ok: false, error: "Could not load progress" }, 502); }
}

function emptyAchievements() { return [{ title: "Первый шаг", text: "Сыграй первую тренировку", done: false, progress: 0, goal: 1 }, { title: "Разминка", text: "Сыграй 3 тренировки", done: false, progress: 0, goal: 3 }, { title: "Точный прицел", text: "Точность 90%+", done: false, progress: 0, goal: 1 }, { title: "Мастер тренировок", text: "Сыграй 10 тренировок", done: false, progress: 0, goal: 10 }, { title: "Исследователь", text: "Попробуй 4 игры", done: false, progress: 0, goal: 4 }]; }
function emptyQuests() { return [{ title: "Две тренировки", text: "Сыграй 2 раза сегодня", progress: 0, goal: 2, reward: 20 }, { title: "Набор очков", text: "Набери 500 очков сегодня", progress: 0, goal: 500, reward: 30 }, { title: "Чистая серия", text: "2 тренировки с точностью 80%+", progress: 0, goal: 2, reward: 30 }]; }
async function rows(url, h) { const r = await fetch(url, { headers: h }); if (!r.ok) throw Error("query"); const v = await r.json(); return Array.isArray(v) ? v : []; }
async function one(url, h) { const v = await rows(url, h); return v[0] || null; }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" } }); }
function htmlHeaders() { return { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "permissions-policy": "camera=(), microphone=(), geolocation=()" }; }
