import legacy from "./worker.js";

const MAX_AUTH_AGE_SECONDS = 3600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/game-sessions") {
      try {
        const body = await request.json();
        const auth = await validateTelegramInitData(body?.initData, env.TELEGRAM_BOT_TOKEN);
        if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

        const gameCode = typeof body?.game_code === "string" ? body.game_code : "";
        const score = Number(body?.score);
        const difficulty = Number(body?.difficulty ?? 1);
        const reactionMs = body?.reaction_ms == null ? null : Number(body.reaction_ms);
        const falseStarts = Number(body?.false_starts ?? 0);
        const accuracy = body?.accuracy_percent == null ? null : Number(body.accuracy_percent);

        if (!/^[a-z0-9_]{2,64}$/.test(gameCode)) return json({ ok:false,error:"Invalid game code" },400);
        if (!Number.isInteger(score) || score < 0 || score > 1000000) return json({ ok:false,error:"Invalid score" },400);
        if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 20) return json({ ok:false,error:"Invalid difficulty" },400);
        if (reactionMs !== null && (!Number.isInteger(reactionMs) || reactionMs < 1 || reactionMs > 60000)) return json({ ok:false,error:"Invalid reaction" },400);
        if (!Number.isInteger(falseStarts) || falseStarts < 0 || falseStarts > 100) return json({ ok:false,error:"Invalid false starts" },400);
        if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100)) return json({ ok:false,error:"Invalid accuracy" },400);

        const key = env.SUPABASE_SECRET_KEY;
        if (!env.SUPABASE_URL || !key) return json({ ok:false,error:"Server storage configuration error" },500);

        const rpc = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/record_game_session`, {
          method:"POST",
          headers:{apikey:key,Authorization:`Bearer ${key}`,"content-type":"application/json"},
          body:JSON.stringify({
            p_telegram_id:auth.user.id,p_first_name:auth.user.first_name,p_username:auth.user.username,
            p_game_code:gameCode,p_score:score,p_difficulty:difficulty,p_reaction_ms:reactionMs,
            p_false_starts:falseStarts,p_accuracy_percent:accuracy
          })
        });

        const text = await rpc.text();
        if (!rpc.ok) return json({ ok:false,error:"Could not save game result" },502);
        let result={}; try { result=JSON.parse(text); } catch {}
        return json({ ok:true,...result });
      } catch {
        return json({ ok:false,error:"Could not save game result" },500);
      }
    }

    const response = await legacy.fetch(request, env, ctx);
    if (request.method === "GET" && url.pathname === "/" && response.ok) {
      const html = await response.text();
      const injected = `
<script>
(() => {
  let saved = false;
  let falseStarts = 0;
  const original = window.falseStart;
  if (typeof original === 'function') {
    window.falseStart = function(...args) { falseStarts++; return original.apply(this,args); };
  }
  const save = async (reactionMs) => {
    if (saved || !Number.isInteger(reactionMs) || reactionMs < 1 || reactionMs > 60000) return;
    saved = true;
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;
    try {
      await fetch('/api/game-sessions', {
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({initData,game_code:'lightning',score:Math.max(0,1000-reactionMs),difficulty:1,reaction_ms:reactionMs,false_starts:falseStarts})
      });
    } catch (_) { saved = false; }
  };
  const scan = () => {
    const h1 = document.querySelector('h1');
    if (!h1) return;
    const m = h1.textContent.match(/^(\\d+)\\s*мс$/);
    if (m) save(Number(m[1]));
  };
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  scan();
})();
</script>`;
      const headers = new Headers(response.headers);
      headers.set("cache-control","no-store");
      return new Response(html.replace("</body>",injected+"\n</body>"),{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};

async function validateTelegramInitData(initData,botToken) {
 if (!initData||!botToken) return {ok:false,error:"Missing Telegram authorization"};
 const params=new URLSearchParams(initData),receivedHash=params.get("hash"),authDate=Number(params.get("auth_date")),userRaw=params.get("user");
 if(!receivedHash||!authDate||!userRaw) return {ok:false,error:"Invalid Telegram initData"};
 const now=Math.floor(Date.now()/1000);
 if(authDate>now+60||now-authDate>MAX_AUTH_AGE_SECONDS) return {ok:false,error:"Telegram authorization expired"};
 params.delete("hash");
 const d=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
 const e=new TextEncoder(),secret=await hmac(e.encode("WebAppData"),e.encode(botToken)),calculated=toHex(await hmac(secret,e.encode(d)));
 if(!constantTimeEqual(calculated,receivedHash)) return {ok:false,error:"Invalid Telegram signature"};
 let user;try{user=JSON.parse(userRaw)}catch{return {ok:false,error:"Invalid Telegram user"}}
 return user?.id?{ok:true,user:{id:user.id,first_name:user.first_name??null,username:user.username??null}}:{ok:false,error:"Telegram user not found"};
}
async function hmac(key,data){const k=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-256"},false,["sign"]);return crypto.subtle.sign("HMAC",k,data)}
function toHex(b){return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function constantTimeEqual(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
