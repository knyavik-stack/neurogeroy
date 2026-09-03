import app from "./progress_entry.js";
import { renderFocusRibbonHtml } from "./games/focus_ribbon.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/games/focus-ribbon") {
      if (!(await gameEnabled(env, "focus_ribbon"))) return new Response(JSON.stringify({ok:false,error:"Game disabled"}), {status:404,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store"}});
      return new Response(renderFocusRibbonHtml(), {headers:{"content-type":"text/html; charset=UTF-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}});
    }
    return app.fetch(request, env, ctx);
  }
};

async function gameEnabled(env,code){
  const key=env.SUPABASE_SECRET_KEY;
  if(!env.SUPABASE_URL||!key)return false;
  try{
    const r=await fetch(env.SUPABASE_URL.replace(/\/$/,"")+`/rest/v1/games?select=code&code=eq.${encodeURIComponent(code)}&enabled=eq.true&limit=1`,{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!r.ok)return false;
    const rows=await r.json();return Array.isArray(rows)&&rows.length===1;
  }catch{return false}
}
