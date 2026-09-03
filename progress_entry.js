import app from "./worker_entry.js";

const MAX_AUTH_AGE_SECONDS = 3600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/progress") return progressApi(request, env);
    if (request.method === "GET" && url.pathname === "/progress") return progressPage();
    if (request.method === "GET" && url.pathname === "/") return injectProgressButton(await app.fetch(request, env, ctx));
    return app.fetch(request, env, ctx);
  }
};

async function progressApi(request, env) {
  const auth = await validateTelegramInitData(request.headers.get("x-telegram-init-data"), env.TELEGRAM_BOT_TOKEN);
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);
  const key = env.SUPABASE_SECRET_KEY;
  if (!env.SUPABASE_URL || !key) return json({ ok: false, error: "Server storage configuration error" }, 500);
  const base = env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/";
  try {
    const headers = { apikey: key, Authorization: "Bearer " + key };
    const player = await getOne(base + "players?select=id,first_name,character_name,level,experience,coins&telegram_id=eq." + encodeURIComponent(auth.user.id) + "&limit=1", headers);
    if (!player) return json({ ok: true, player: { first_name: auth.user.first_name, level: 1, experience: 0, coins: 0 }, skills: [], comparison: [] });
    const [analytics, games, sessions] = await Promise.all([
      getRows(base + "player_game_analytics?select=game_code,sessions_count,best_score,average_accuracy_percent,average_duration_ms,average_error_count,last_played_at&player_id=eq." + encodeURIComponent(player.id), headers),
      getRows(base + "games?select=code,title,skill_domain,enabled,route&enabled=eq.true&order=sort_order.asc,code.asc", headers),
      getRows(base + "game_sessions?select=game_code,score,accuracy_percent,reaction_ms,created_at,completed_at&player_id=eq." + encodeURIComponent(player.id) + "&created_at=gte." + encodeURIComponent(new Date(Date.now() - 8 * 86400000).toISOString()) + "&order=created_at.desc&limit=500", headers)
    ]);
    const byCode = Object.fromEntries((analytics || []).map(x => [x.game_code, x]));
    const recent = sessions || [];
    const now = new Date();
    const dayKey = d => d.toISOString().slice(0, 10);
    const todayKey = dayKey(now);
    const weekAgoKey = dayKey(new Date(now.getTime() - 7 * 86400000));
    const daily = (code, key) => {
      const rows = recent.filter(s => s.game_code === code && dayKey(new Date(s.created_at || s.completed_at)) === key);
      if (!rows.length) return null;
      const scores = rows.map(s => Number(s.score)).filter(Number.isFinite);
      const acc = rows.map(s => Number(s.accuracy_percent)).filter(Number.isFinite);
      const reactions = rows.map(s => Number(s.reaction_ms)).filter(Number.isFinite);
      return { sessions: rows.length, score: scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null, accuracy: acc.length ? Math.round(acc.reduce((a,b)=>a+b,0)/acc.length) : null, reaction_ms: reactions.length ? Math.min(...reactions) : null };
    };
    const skills = (games || []).slice(0, 3).map(g => {
      const a = byCode[g.code] || {};
      const today = daily(g.code, todayKey), weekAgo = daily(g.code, weekAgoKey);
      return { code:g.code, title:g.title, skill_domain:g.skill_domain, sessions:Number(a.sessions_count||0), best_score:a.best_score==null?null:Number(a.best_score), accuracy:a.average_accuracy_percent==null?null:Math.round(Number(a.average_accuracy_percent)), avg_duration_ms:a.average_duration_ms==null?null:Math.round(Number(a.average_duration_ms)), avg_errors:a.average_error_count==null?null:Math.round(Number(a.average_error_count)*10)/10, last_played_at:a.last_played_at||null, today, week_ago:weekAgo };
    });
    return json({ ok:true, player:{ first_name:player.first_name || auth.user.first_name, character_name:player.character_name, level:Number(player.level||1), experience:Number(player.experience||0), coins:Number(player.coins||0) }, skills, comparison:{ today:todayKey, week_ago:weekAgoKey } });
  } catch (_) { return json({ ok:false, error:"Could not load progress" }, 502); }
}

async function getRows(url, headers) { const r = await fetch(url, { headers }); if (!r.ok) throw new Error("query"); const v = await r.json(); return Array.isArray(v) ? v : []; }
async function getOne(url, headers) { const rows = await getRows(url, headers); return rows[0] || null; }

function progressPage() {
  return new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="https://telegram.org/js/telegram-web-app.js"></script><title>NeuroGeroy · Мой прогресс</title><style>:root{--bg:#101322;--card:#1b2035;--text:#fff;--muted:#b9c0dc;--line:rgba(255,255,255,.1)}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,Arial,sans-serif}#app{min-height:100vh;padding:20px}.wrap{width:min(100%,560px);margin:auto}.card{padding:22px;border-radius:26px;background:linear-gradient(145deg,#1d233b,#111524);box-shadow:0 20px 70px rgba(0,0,0,.3);margin-bottom:14px}h1{margin:5px 0 8px;font-size:36px}.eyebrow{font-size:11px;letter-spacing:.14em;opacity:.65;font-weight:800}.muted{color:var(--muted);line-height:1.45}.level{display:flex;justify-content:space-between;align-items:end}.level strong{font-size:42px}.xp{margin-top:14px;height:9px;border-radius:20px;background:rgba(255,255,255,.09);overflow:hidden}.xp i{display:block;height:100%;background:#fff;width:0}.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}.stat{padding:14px;border:1px solid var(--line);border-radius:16px}.stat b{display:block;font-size:20px;margin-top:4px}.skill{padding:18px 0;border-top:1px solid var(--line)}.skill:first-child{border-top:0}.skilltop{display:flex;justify-content:space-between;gap:12px}.skilltop b{font-size:18px}.pill{font-size:12px;color:var(--muted)}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.metric{padding:10px;border-radius:14px;background:rgba(255,255,255,.06);font-size:12px;color:var(--muted)}.metric b{display:block;color:#fff;font-size:16px;margin-bottom:2px}.compare{margin-top:12px;padding:12px;border-radius:14px;background:rgba(255,255,255,.05);font-size:13px;color:var(--muted)}button{width:100%;border:0;border-radius:18px;padding:16px;font-size:17px;font-weight:800}.secondary{background:transparent;border:1px solid var(--line);color:#fff;margin-top:10px}</style></head><body><main id="app"><div class="wrap"><section class="card"><div class="eyebrow">НЕЙРОГЕРОЙ · МОЙ ПРОГРЕСС</div><div id="hero"><h1>Загрузка…</h1></div></section><section class="card"><div class="eyebrow">НАВЫКИ</div><div id="skills"></div></section><button class="secondary" onclick="location.href='/'">К миссиям</button></div></main><script>const tg=window.Telegram?.WebApp;try{tg?.ready();tg?.expand()}catch(_){};const app=document.getElementById('app');const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const fmt=n=>n==null?'—':new Intl.NumberFormat('ru-RU').format(n);const delta=(a,b)=>a==null||b==null?'':(a>b?' ↑':' ↓')+' '+fmt(Math.abs(a-b));async function load(){const r=await fetch('/api/progress',{headers:{'X-Telegram-Init-Data':tg?.initData||''},cache:'no-store'});const j=await r.json();if(!r.ok){document.getElementById('hero').innerHTML='<h1>Прогресс недоступен</h1><p class="muted">Открой приложение из Telegram, чтобы увидеть личную статистику.</p>';return}const p=j.player||{};const xp=Number(p.experience||0);const level=Number(p.level||1);const step=100+level*50;const pct=Math.max(0,Math.min(100,Math.round((xp%step)/step*100)));document.getElementById('hero').innerHTML='<div class="level"><div><h1>'+esc(p.first_name||'Герой')+'</h1><div class="muted">Уровень и накопленный опыт</div></div><strong>'+level+'</strong></div><div class="xp"><i style="width:'+pct+'%"></i></div><div class="stats"><div class="stat"><span class="pill">Опыт</span><b>'+fmt(xp)+'</b></div><div class="stat"><span class="pill">Монеты</span><b>'+fmt(p.coins||0)+'</b></div></div>';const labels={reaction:'Скорость реакции',working_memory:'Рабочая память',cognitive_flexibility:'Когнитивная гибкость',sustained_attention:'Устойчивое внимание',pattern_recognition:'Распознавание паттернов',divided_attention:'Распределённое внимание'};const rows=(j.skills||[]).map(s=>{const today=s.today,week=s.week_ago;let cmp='Нет данных для сравнения';if(today||week){cmp='Сегодня: '+(today?.score!=null?fmt(today.score):'нет результата')+' · 7 дней назад: '+(week?.score!=null?fmt(week.score):'нет результата');if(today?.accuracy!=null&&week?.accuracy!=null)cmp+=' · точность '+fmt(today.accuracy)+'%'+delta(today.accuracy,week.accuracy)+' п.п.'}return '<article class="skill"><div class="skilltop"><b>'+esc(labels[s.skill_domain]||s.title)+'</b><span class="pill">'+esc(s.title)+'</span></div><div class="metrics"><div class="metric"><b>'+fmt(s.sessions)+'</b>игр</div><div class="metric"><b>'+(s.accuracy==null?'—':fmt(s.accuracy)+'%')+'</b>средняя точность</div><div class="metric"><b>'+fmt(s.best_score)+'</b>лучший счёт</div></div><div class="compare">'+cmp+'</div></article>'}).join('');document.getElementById('skills').innerHTML=rows||'<p class="muted">Сыграй первую тренировку — здесь появится твой измеримый прогресс.</p>'}load().catch(()=>{document.getElementById('hero').innerHTML='<h1>Не удалось загрузить</h1><p class="muted">Попробуй обновить экран.</p>'});</script></body></html>`, {headers:{'content-type':'text/html; charset=UTF-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
}

async function injectProgressButton(response) {
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return response;
  const html = await response.text();
  const button = '<script>(()=>{if(document.getElementById("progress-link"))return;const start=document.getElementById("start");if(!start)return;const b=document.createElement("button");b.id="progress-link";b.className="secondary";b.textContent="📈 Мой прогресс";b.onclick=()=>location.href="/progress";start.insertAdjacentElement("afterend",b)})()</script>';
  const headers = new Headers(response.headers); headers.set("cache-control","no-store");
  return new Response(html.replace("</body>", button + "</body>"), { status:response.status, headers });
}

async function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return {ok:false,error:"Missing Telegram authorization"};
  const p = new URLSearchParams(initData), hash = p.get("hash"), date = Number(p.get("auth_date")), raw = p.get("user");
  if (!hash || !date || !raw) return {ok:false,error:"Invalid Telegram initData"};
  const now = Math.floor(Date.now()/1000); if (date > now + 60 || now - date > MAX_AUTH_AGE_SECONDS) return {ok:false,error:"Telegram authorization expired"};
  p.delete("hash"); const s=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("\\n"), e=new TextEncoder();
  const secret=await hmac(e.encode("WebAppData"),e.encode(botToken)), calc=toHex(await hmac(secret,e.encode(s)));
  if(!constantTimeEqual(calc,hash)) return {ok:false,error:"Invalid Telegram signature"};
  let u; try{u=JSON.parse(raw)}catch{return{ok:false,error:"Invalid Telegram user"}};
  return u?.id?{ok:true,user:{id:u.id,first_name:u.first_name??null,username:u.username??null}}:{ok:false,error:"Telegram user not found"};
}
async function hmac(key,data){const k=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);return crypto.subtle.sign("HMAC",k,data)}
function toHex(b){return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function constantTimeEqual(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store"}})}
