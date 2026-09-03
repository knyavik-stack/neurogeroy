import legacy from "./worker.js";

const MAX_AUTH_AGE_SECONDS = 3600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/games") return listGames(env);

    if (request.method === "GET" && url.pathname === "/games/memory-grid") {
      if (!(await gameEnabled(env, "memory_grid"))) return json({ok:false,error:"Game disabled"},404);
      return new Response(MEMORY_GRID_HTML, { headers: htmlHeaders() });
    }

    if (request.method === "POST" && url.pathname === "/api/game-sessions") {
      try {
        const body = await request.json();
        const auth = await validateTelegramInitData(body?.initData, env.TELEGRAM_BOT_TOKEN);
        if (!auth.ok) return json({ok:false,error:auth.error},401);
        const gameCode=typeof body?.game_code==="string"?body.game_code:"";
        const score=Number(body?.score), difficulty=Number(body?.difficulty??1);
        const reactionMs=body?.reaction_ms==null?null:Number(body.reaction_ms), falseStarts=Number(body?.false_starts??0);
        const accuracy=body?.accuracy_percent==null?null:Number(body.accuracy_percent), durationMs=body?.duration_ms==null?null:Number(body.duration_ms);
        const errorCount=Number(body?.error_count??0), gridSize=body?.grid_size==null?null:Number(body.grid_size), patternLength=body?.pattern_length==null?null:Number(body.pattern_length);
        const inputTiming=body?.input_timing_ms==null?null:body.input_timing_ms;
        if(!/^[a-z0-9_]{2,64}$/.test(gameCode)||!Number.isInteger(score)||score<0||score>1000000||!Number.isInteger(difficulty)||difficulty<1||difficulty>20) return json({ok:false,error:"Invalid game result"},400);
        if(reactionMs!==null&&(!Number.isInteger(reactionMs)||reactionMs<1||reactionMs>60000)||!Number.isInteger(falseStarts)||falseStarts<0||falseStarts>100) return json({ok:false,error:"Invalid reaction data"},400);
        if(accuracy!==null&&(!Number.isFinite(accuracy)||accuracy<0||accuracy>100)||durationMs!==null&&(!Number.isInteger(durationMs)||durationMs<1||durationMs>120000)||!Number.isInteger(errorCount)||errorCount<0||errorCount>1000) return json({ok:false,error:"Invalid game metrics"},400);
        if(gridSize!==null&&(!Number.isInteger(gridSize)||gridSize<2||gridSize>10)||patternLength!==null&&(!Number.isInteger(patternLength)||patternLength<1||patternLength>100)||inputTiming!==null&&(!Array.isArray(inputTiming)||inputTiming.length>100)) return json({ok:false,error:"Invalid game metrics"},400);
        const key=env.SUPABASE_SECRET_KEY;if(!env.SUPABASE_URL||!key)return json({ok:false,error:"Server storage configuration error"},500);
        const rpc=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/rpc/record_game_session",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({p_telegram_id:auth.user.id,p_first_name:auth.user.first_name,p_username:auth.user.username,p_game_code:gameCode,p_score:score,p_difficulty:difficulty,p_reaction_ms:reactionMs,p_false_starts:falseStarts,p_accuracy_percent:accuracy,p_duration_ms:durationMs,p_error_count:errorCount,p_grid_size:gridSize,p_pattern_length:patternLength,p_input_timing_ms:inputTiming})});
        const text=await rpc.text();if(!rpc.ok)return json({ok:false,error:"Could not save game result"},502);let result={};try{result=JSON.parse(text)}catch{}return json({ok:true,...result});
      } catch { return json({ok:false,error:"Could not save game result"},500); }
    }

    const response=await legacy.fetch(request,env,ctx);
    if(request.method==="GET"&&url.pathname==="/"&&response.ok){
      const html=await response.text();
      const injected='<script>(()=>{let saved=false,falseStarts=0,catalogLoaded=false;const renderCatalog=async()=>{const start=document.getElementById("start");if(!start||catalogLoaded)return;if(!window.fetch)return;catalogLoaded=true;try{const r=await fetch("/api/games",{cache:"no-store"});const data=await r.json();if(!r.ok||!data.ok)return;for(const game of (data.games||[])){if(!game.route||game.route==="/")continue;const id="game-link-"+game.code;if(document.getElementById(id))continue;const b=document.createElement("button");b.id=id;b.className="secondary";b.textContent=(game.config?.icon?game.config.icon+" ":"🎯 ")+game.title;b.onclick=()=>location.href=game.route;start.insertAdjacentElement("afterend",b)}}catch(_){}};const original=window.falseStart;if(typeof original==="function")window.falseStart=function(...a){falseStarts++;return original.apply(this,a)};const save=async ms=>{if(saved||!Number.isInteger(ms)||ms<1||ms>60000)return;saved=true;const initData=window.Telegram?.WebApp?.initData;if(!initData)return;try{await fetch("/api/game-sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,game_code:"lightning",score:Math.max(0,1000-ms),difficulty:1,reaction_ms:ms,false_starts:falseStarts})})}catch(_){saved=false}};const scan=()=>{const h=document.querySelector("h1");const m=h?.textContent.match(/^(\\d+)\\s*мс$/);if(m)save(Number(m[1]))};new MutationObserver(()=>{scan();renderCatalog()}).observe(document.documentElement,{childList:true,subtree:true});scan();renderCatalog()})();</script>';
      const headers=new Headers(response.headers);headers.set("cache-control","no-store");return new Response(html.replace("</body>",injected+"\n</body>"),{status:response.status,headers});
    }
    return response;
  }
};

async function listGames(env){
  const key=env.SUPABASE_SECRET_KEY;
  if(!env.SUPABASE_URL||!key)return json({ok:false,error:"Server storage configuration error"},500);
  try{
    const r=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+"/rest/v1/games?select=code,title,skill_domain,route,sort_order,config&enabled=eq.true&route=not.is.null&order=sort_order.asc,code.asc",{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!r.ok)return json({ok:false,error:"Could not load game catalog"},502);
    const games=await r.json();
    return json({ok:true,games:Array.isArray(games)?games:[]});
  }catch{return json({ok:false,error:"Could not load game catalog"},502)}
}

async function gameEnabled(env,code){
  const key=env.SUPABASE_SECRET_KEY;
  if(!env.SUPABASE_URL||!key)return false;
  try{
    const r=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+`/rest/v1/games?select=code&code=eq.${encodeURIComponent(code)}&enabled=eq.true&limit=1`,{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!r.ok)return false;
    const rows=await r.json();return Array.isArray(rows)&&rows.length===1;
  }catch{return false}
}

const MEMORY_GRID_HTML=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="https://telegram.org/js/telegram-web-app.js"></script><title>NeuroGeroy · Память-сетка</title><style>:root{--bg:#101322;--card:#1b2035;--text:#fff;--muted:#b9c0dc}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,Arial,sans-serif}#app{min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(100%,520px);padding:28px;border-radius:30px;background:linear-gradient(145deg,#1d233b,#111524);text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.35)}h1{font-size:clamp(32px,9vw,48px)}p{color:var(--muted);line-height:1.5}.eyebrow{font-size:12px;letter-spacing:.14em;opacity:.65;font-weight:700}button{width:100%;margin-top:14px;border:0;border-radius:18px;padding:17px;font-size:17px;font-weight:800}.secondary{background:transparent;border:1px solid rgba(255,255,255,.2);color:#fff}.memory-grid{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:10px;margin:22px auto}.cell{aspect-ratio:1;border-radius:16px;background:#27304b;border:0;margin:0}.cell.active{background:#fff;box-shadow:0 0 25px rgba(255,255,255,.35)}.cell:disabled{opacity:1}.best{padding:15px;border-radius:16px;background:rgba(255,255,255,.07)}</style></head><body><div id="app"></div><script>
const app=document.getElementById("app"),tg=window.Telegram?.WebApp;try{tg?.ready();tg?.expand()}catch(_){} let d=1,phase="intro",pattern=[],selected=[],errors=0,startedAt=0,clickTimes=[],saved=false;
const cfg=()=>d<=2?{n:3,count:d+2,ms:850+d*150}:{n:4,count:d+2,ms:1150};
const hap=t=>{try{if(t==="success"||t==="error")tg?.HapticFeedback?.notificationOccurred(t);else tg?.HapticFeedback?.impactOccurred(t||"light")}catch(_){}};
function make(){const c=cfg(),a=Array.from({length:c.n*c.n},(_,i)=>i);for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,c.count)}
function render(){if(phase==="intro"){app.innerHTML='<section class="card"><div class="eyebrow">МИССИЯ · ПАМЯТЬ-СЕТКА</div><h1>Запомни рисунок</h1><p>Клетки загорятся. Затем повтори рисунок.</p><button id="start">Начать</button><button id="back" class="secondary">К миссиям</button></section>';document.getElementById("start").onclick=begin;document.getElementById("back").onclick=()=>location.href="/";return}if(phase==="memorize"||phase==="play"){const c=cfg(),active=phase==="memorize"?pattern:selected;app.innerHTML='<section class="card"><div class="eyebrow">'+(phase==="memorize"?"ЗАПОМИНАЙ":"ПОВТОРИ РИСУНОК")+'</div><h1>'+pattern.length+' клеток</h1><div class="memory-grid" id="grid" style="--n:'+c.n+'"></div><p>'+ (phase==="memorize"?"Смотри внимательно…":"Выбери все клетки, которые были подсвечены")+'</p></section>';const g=document.getElementById("grid");for(let i=0;i<c.n*c.n;i++){const b=document.createElement("button");b.className="cell"+(active.includes(i)?" active":"");b.disabled=phase!=="play";b.onclick=()=>pick(i);g.appendChild(b)}return}const correct=selected.filter(x=>pattern.includes(x)).length,accuracy=Math.round(correct/pattern.length*100),complete=correct===pattern.length&&errors===0,score=Math.max(0,Math.round((correct/pattern.length)*700+d*100-errors*100));app.innerHTML='<section class="card"><div class="eyebrow">РЕЗУЛЬТАТ · ПАМЯТЬ-СЕТКА</div><h1>'+score+'</h1><p>Точность: '+accuracy+'% · Ошибки: '+errors+' · Сложность: '+d+'</p><div class="best">'+(complete?"Рисунок собран":"Хорошая попытка — попробуй ещё раз")+' · Время: '+Math.round((performance.now()-startedAt)/100)/10+' с</div><button id="again">Следующий раунд</button><button id="home" class="secondary">К миссиям</button></section>';document.getElementById("again").onclick=()=>{if(complete&&d<6)d++;begin()};document.getElementById("home").onclick=()=>location.href="/";save(score,accuracy,complete)}
function begin(){saved=false;errors=0;clickTimes=[];pattern=make();selected=[];phase="memorize";startedAt=performance.now();hap("light");render();setTimeout(()=>{phase="play";startedAt=performance.now();render()},cfg().ms)}
function pick(i){if(phase!=="play"||selected.includes(i))return;const now=performance.now();clickTimes.push(Math.round(now-(clickTimes.length?clickTimes[clickTimes.length-1]:startedAt)));if(!pattern.includes(i)){errors++;hap("error");render();return}selected.push(i);hap("light");if(selected.length===pattern.length){hap("success");phase="result"}render()}
async function save(score,accuracy,complete){if(saved)return;saved=true;const initData=tg?.initData;if(!initData)return;const durationMs=Math.max(1,Math.round(performance.now()-startedAt));try{await fetch("/api/game-sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,game_code:"memory_grid",score,difficulty:d,false_starts:0,accuracy_percent:accuracy,duration_ms:durationMs,error_count:errors,grid_size:cfg().n,pattern_length:pattern.length,input_timing_ms:clickTimes})})}catch(_){saved=false}}
render();</script></body></html>`;
function htmlHeaders(){return {"content-type":"text/html; charset=UTF-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}}
async function validateTelegramInitData(initData,botToken){if(!initData||!botToken)return{ok:false,error:"Missing Telegram authorization"};const p=new URLSearchParams(initData),hash=p.get("hash"),date=Number(p.get("auth_date")),raw=p.get("user");if(!hash||!date||!raw)return{ok:false,error:"Invalid Telegram initData"};const now=Math.floor(Date.now()/1000);if(date>now+60||now-date>MAX_AUTH_AGE_SECONDS)return{ok:false,error:"Telegram authorization expired"};p.delete("hash");const s=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("\n"),e=new TextEncoder(),secret=await hmac(e.encode("WebAppData"),e.encode(botToken)),calc=toHex(await hmac(secret,e.encode(s)));if(!constantTimeEqual(calc,hash))return{ok:false,error:"Invalid Telegram signature"};let u;try{u=JSON.parse(raw)}catch{return{ok:false,error:"Invalid Telegram user"}}return u?.id?{ok:true,user:{id:u.id,first_name:u.first_name??null,username:u.username??null}}:{ok:false,error:"Telegram user not found"}}
async function hmac(key,data){const k=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);return crypto.subtle.sign("HMAC",k,data)}function toHex(b){return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}function constantTimeEqual(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store"}})}