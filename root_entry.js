import app from "./worker_entry.js";
import legacy from "./worker.js";
import { validateTelegram } from "./telegram_auth.js";
import { renderProgressPage } from "./progress_page.js";
import { renderMemoryGridHtml } from "./games/memory_grid_v2.js";
import { renderFocusRibbonHtml } from "./games/focus_ribbon_v2.js";
import { renderSwitcherHtml } from "./games/switcher_v2.js";

const CATALOG=[
  {code:"lightning",title:"Молния",icon:"⚡",route:"/games/lightning"},
  {code:"memory_grid",title:"Память-сетка",icon:"🧠",route:"/games/memory-grid"},
  {code:"switcher",title:"Переключатель",icon:"🔄",route:"/games/switcher"},
  {code:"focus_ribbon",title:"Фокус-лента",icon:"🎯",route:"/games/focus-ribbon"}
];
const enabledCache=new Map();

export default{async fetch(request,env,ctx){
  const u=new URL(request.url);

  if(request.method==="GET"&&u.pathname==="/"){
    return new Response(enhanceHtml(await menuHtml(env)),{headers:htmlHeaders()});
  }

  if(request.method==="GET"&&u.pathname==="/games/lightning"){
    if(!(await gameEnabled(env,"lightning")))return json({ok:false,error:"Game disabled"},404);
    const target=new URL(request.url);target.pathname="/";
    const legacyRequest=new Request(target,request);
    const response=await legacy.fetch(legacyRequest,env,ctx);
    if(!response.ok||!response.headers.get("content-type")?.includes("text/html"))return response;
    let html=await response.text();
    const script='<script>(()=>{let saved=false,falseStarts=0;const original=window.falseStart;if(typeof original==="function")window.falseStart=function(...a){falseStarts++;return original.apply(this,a)};const save=async ms=>{if(saved||!Number.isInteger(ms)||ms<1||ms>60000)return;saved=true;const initData=window.Telegram?.WebApp?.initData;if(!initData)return;try{const r=await fetch("/api/game-sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,game_code:"lightning",score:Math.max(0,1000-ms),difficulty:1,reaction_ms:ms,false_starts:falseStarts})});if(!r.ok)saved=false}catch(_){saved=false}};const scan=()=>{const h=document.querySelector("h1");const m=h?.textContent.match(/^(\\d+)\\s*мс$/);if(m)save(Number(m[1]))};const root=document.getElementById("app")||document.body;new MutationObserver(scan).observe(root,{childList:true});scan()})()</script>';
    const headers=new Headers(response.headers);headers.set("cache-control","no-store");
    return new Response(enhanceHtml(html.replace("</body>",script+"</body>")),{status:response.status,headers});
  }

  if(request.method==="GET"&&u.pathname==="/progress")return new Response(enhanceHtml(renderProgressPage()),{headers:htmlHeaders()});
  if(request.method==="GET"&&u.pathname==="/api/progress")return progressApi(request,env);

  if(request.method==="GET"&&(u.pathname==="/games/memory-grid"||u.pathname==="/games/focus-ribbon"||u.pathname==="/games/switcher")){
    const code=u.pathname.endsWith("memory-grid")?"memory_grid":u.pathname.endsWith("focus-ribbon")?"focus_ribbon":"switcher";
    if(!(await gameEnabled(env,code)))return json({ok:false,error:"Game disabled"},404);
    const html=code==="memory_grid"?renderMemoryGridHtml():code==="focus_ribbon"?renderFocusRibbonHtml():renderSwitcherHtml();
    return new Response(enhanceHtml(html),{headers:htmlHeaders()});
  }

  return app.fetch(request,env,ctx);
}};

function enhanceHtml(html){
  const withDefer=html.replace(/<script\s+src=["']https:\/\/telegram\.org\/js\/telegram-web-app\.js["']\s*>/gi,'<script defer src="https://telegram.org/js/telegram-web-app.js">');
  const guard='<script>(()=>{const nativeFetch=window.fetch.bind(window);const show=(retry)=>{if(document.getElementById("save-error"))return;const box=document.createElement("div");box.id="save-error";box.style="position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:14px 16px;border-radius:16px;background:#2a1b25;color:#fff;font:700 15px Arial,sans-serif;box-shadow:0 12px 35px #0008;text-align:center";box.innerHTML="Не удалось сохранить результат.<br><button id=\"save-retry\" style=\"margin-top:10px;padding:10px 16px;border-radius:12px;border:0;font-weight:700\">Повторить</button>";document.body.appendChild(box);box.querySelector("#save-retry").onclick=async()=>{box.remove();await retry()}};window.fetch=async(...args)=>{const r=await nativeFetch(...args);try{const input=args[0],url=typeof input==="string"?input:input?.url||"",method=(args[1]?.method||input?.method||"GET").toUpperCase();if(method==="POST"&&url.includes("/api/game-sessions")&&!r.ok){let body=null;try{body=args[1]?.body?String(args[1].body):null}catch(_){};show(async()=>{if(body){const rr=await nativeFetch(url,{method:"POST",headers:{"content-type":"application/json"},body});if(!rr.ok)show(async()=>{})}})}}catch(_){}return r}})()</script>';
  return withDefer.replace("</body>",guard+"</body>");
}

async function menuHtml(env){
  let games=CATALOG;
  try{
    const key=env.SUPABASE_SECRET_KEY;
    if(env.SUPABASE_URL&&key){
      const r=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/games?select=code,title,skill_domain,sort_order&enabled=eq.true&order=sort_order.asc,code.asc",{headers:{apikey:key,Authorization:"Bearer "+key}});
      if(r.ok){const rows=await r.json();if(Array.isArray(rows)&&rows.length)games=rows.map(g=>{const c=CATALOG.find(x=>x.code===g.code);return c?{...c,title:g.title||c.title}:null}).filter(Boolean)}
    }
  }catch(_){games=CATALOG}
  const cards=games.map(g=>'<button class="game" data-route="'+g.route+'"><span>'+g.icon+'</span><b>'+esc(g.title)+'</b></button>').join("");
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="https://telegram.org/js/telegram-web-app.js"></script><title>НейроГерой · Игры</title><style>:root{--bg:#101322;--card:#1b2035;--text:#fff;--muted:#b9c0dc}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,sans-serif}main{width:min(100%,600px);margin:auto;padding:24px 18px 32px}.hero{padding:24px 4px 14px}h1{font-size:40px;margin:8px 0}.muted{color:var(--muted);line-height:1.5}.grid{display:grid;gap:12px}.game{width:100%;display:flex;align-items:center;gap:16px;padding:18px;border:1px solid #ffffff18;border-radius:20px;background:var(--card);color:#fff;text-align:left;font-size:19px;box-shadow:0 12px 30px #0003}.game span{font-size:30px}.progress{margin-top:14px;width:100%;padding:16px;border-radius:18px;border:1px solid #ffffff30;background:transparent;color:#fff;font-size:16px;font-weight:700}</style></head><body><main><section class="hero"><div class="muted">НЕЙРОГЕРОЙ</div><h1>Выбери тренировку</h1><p class="muted">Прокачивай внимание, память, скорость реакции и гибкость мышления.</p></section><section class="grid">'+cards+'</section><button class="progress" id="progress">📈 Мой прогресс</button></main><script>const tg=window.Telegram?.WebApp;try{tg?.ready();tg?.expand();tg?.BackButton?.hide()}catch(_){}document.querySelectorAll(".game").forEach(b=>b.onclick=()=>location.replace(b.dataset.route));document.getElementById("progress").onclick=()=>location.replace("/progress");</script></body></html>';
}

function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}

async function progressApi(request,env){const a=await validateTelegram(request.headers.get("x-telegram-init-data"),env.TELEGRAM_BOT_TOKEN);if(!a.ok)return json({ok:false,error:a.error},401);const key=env.SUPABASE_SECRET_KEY;if(!env.SUPABASE_URL||!key)return json({ok:false,error:"Server storage configuration error"},500);const base=env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/",h={apikey:key,Authorization:"Bearer "+key};try{const p=await one(base+"players?select=id,first_name,character_name,level,experience,coins&telegram_id=eq."+encodeURIComponent(a.user.id)+"&limit=1",h);if(!p)return json({ok:true,player:{first_name:a.user.first_name||"Герой",character_name:"Нейрогерой",level:1,experience:0,coins:0},skills:[],achievements:emptyAchievements(),quests:emptyQuests()});const [st,games,sessions]=await Promise.all([rows(base+"player_game_stats?select=game_code,sessions_count,best_score,best_accuracy_percent&player_id=eq."+p.id,h),rows(base+"games?select=code,title,skill_domain&enabled=eq.true&order=sort_order.asc,code.asc",h),rows(base+"game_sessions?select=game_code,score,accuracy_percent,created_at&player_id=eq."+p.id+"&order=created_at.desc&limit=500",h)]);const by=Object.fromEntries(st.map(x=>[x.game_code,x])),all=Array.isArray(sessions)?sessions:[],today=new Date().toISOString().slice(0,10),todayRows=all.filter(x=>String(x.created_at||"").slice(0,10)===today),labels={reaction:"Скорость реакции",working_memory:"Рабочая память",cognitive_flexibility:"Когнитивная гибкость",sustained_attention:"Устойчивое внимание"},skills=games.map(g=>{const s=by[g.code]||{};return{code:g.code,title:g.title,skill_title:labels[g.skill_domain]||g.title,sessions:Number(s.sessions_count||0),best_score:s.best_score==null?null:Number(s.best_score),accuracy:s.best_accuracy_percent==null?null:Math.round(Number(s.best_accuracy_percent))}});const total=all.length,distinct=new Set(all.map(x=>x.game_code)).size,scoreToday=todayRows.reduce((n,x)=>n+(Number(x.score)||0),0),high=all.some(x=>Number(x.accuracy_percent)>=90);return json({ok:true,player:{first_name:p.first_name||a.user.first_name||"Герой",character_name:p.character_name||"Нейрогерой",level:Number(p.level||1),experience:Number(p.experience||0),coins:Number(p.coins||0)},skills,achievements:[{title:"Первый шаг",text:"Сыграй первую тренировку",done:total>0,progress:Math.min(total,1),goal:1},{title:"Разминка",text:"Сыграй 3 тренировки",done:total>=3,progress:Math.min(total,3),goal:3},{title:"Точный прицел",text:"Точность 90%+",done:high,progress:high?1:0,goal:1},{title:"Мастер тренировок",text:"Сыграй 10 тренировок",done:total>=10,progress:Math.min(total,10),goal:10},{title:"Исследователь",text:"Попробуй 4 игры",done:distinct>=4,progress:Math.min(distinct,4),goal:4}],quests:[{title:"Две тренировки",text:"Сыграй 2 раза сегодня",progress:Math.min(todayRows.length,2),goal:2,reward:20},{title:"Набор очков",text:"Набери 500 очков сегодня",progress:Math.min(Math.round(scoreToday),500),goal:500,reward:30},{title:"Чистая серия",text:"2 тренировки с точностью 80%+",progress:Math.min(todayRows.filter(x=>Number(x.accuracy_percent)>=80).length,2),goal:2,reward:30}]})}catch(_){return json({ok:false,error:"Could not load progress"},502)}}
function emptyAchievements(){return[{title:"Первый шаг",text:"Сыграй первую тренировку",done:false,progress:0,goal:1},{title:"Разминка",text:"Сыграй 3 тренировки",done:false,progress:0,goal:3},{title:"Точный прицел",text:"Точность 90%+",done:false,progress:0,goal:1},{title:"Мастер тренировок",text:"Сыграй 10 тренировок",done:false,progress:0,goal:10},{title:"Исследователь",text:"Попробуй 4 игры",done:false,progress:0,goal:4}]}
function emptyQuests(){return[{title:"Две тренировки",text:"Сыграй 2 раза сегодня",progress:0,goal:2,reward:20},{title:"Набор очков",text:"Набери 500 очков сегодня",progress:0,goal:500,reward:30},{title:"Чистая серия",text:"2 тренировки с точностью 80%+",progress:0,goal:2,reward:30}]}
async function gameEnabled(env,code){const now=Date.now(),cached=enabledCache.get(code);if(cached&&cached.expires>now)return cached.value;const key=env.SUPABASE_SECRET_KEY;if(!env.SUPABASE_URL||!key)return CATALOG.some(g=>g.code===code);try{const r=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/games?select=code&code=eq."+encodeURIComponent(code)+"&enabled=eq.true&limit=1",{headers:{apikey:key,Authorization:"Bearer "+key}});if(!r.ok)return CATALOG.some(g=>g.code===code);const v=await r.json(),value=Array.isArray(v)&&v.length===1;enabledCache.set(code,{value,expires:now+30000});return value}catch{return CATALOG.some(g=>g.code===code)}}
async function rows(url,h){const r=await fetch(url,{headers:h});if(!r.ok)throw Error("query");const v=await r.json();return Array.isArray(v)?v:[]}
async function one(url,h){const v=await rows(url,h);return v[0]||null}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store"}})}
function htmlHeaders(){return{"content-type":"text/html; charset=UTF-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}}
