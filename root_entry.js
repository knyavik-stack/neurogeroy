import app from "./main_app.js";

// Canonical compatibility entrypoint for deployments that still reference root_entry.js.
// It wraps the canonical app only to guarantee visible navigation in Telegram/WebView.
export default {
  async fetch(request, env, ctx) {
    const response = await app.fetch(request, env, ctx);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;

    const url = new URL(request.url);
    if (request.method !== "GET" || (url.pathname !== "/" && !url.pathname.startsWith("/games/") && url.pathname !== "/progress")) return response;

    const source = await response.text();
    const nav = url.pathname === "/" ? "" : `<script>(()=>{const go=()=>{window.location.href=new URL("/",location.origin).href};const install=()=>{try{const tg=window.getTelegram?.()||window.Telegram?.WebApp;if(!tg)return;tg.ready();tg.expand();tg.BackButton?.show();tg.BackButton?.offClick?.(go);tg.BackButton?.onClick?.(go)}catch(_){}};window.__TG_READY?.then(install);setTimeout(install,700);const add=()=>{if(document.getElementById("neuro-nav-home"))return;const b=document.createElement("button");b.id="neuro-nav-home";b.type="button";b.textContent="‹ К играм";b.onclick=go;b.style.cssText="position:fixed;top:calc(10px + env(safe-area-inset-top));left:10px;z-index:10000;padding:10px 14px;border:1px solid #ffffff30;border-radius:999px;background:#0d1b2cf5;color:#fff;font:800 14px Arial,sans-serif;box-shadow:0 8px 24px #0007;cursor:pointer;touch-action:manipulation";document.body.appendChild(b)};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",add,{once:true});else add()})()</script>`;
    return new Response(source.replace("</body>", nav + "</body>"), { status: response.status, headers: new Headers(response.headers) });
  }
};
