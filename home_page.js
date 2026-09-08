const GAMES = [
  { code: 'lightning', title: 'Молния', skill: 'Скорость реакции', icon: '⚡', route: '/games/lightning', tone: 'cyan', desc: 'Лови сигнал быстрее всех.' },
  { code: 'memory_grid', title: 'Память-сетка', skill: 'Рабочая память', icon: '🧠', route: '/games/memory-grid', tone: 'violet', desc: 'Запоминай последовательности.' },
  { code: 'switcher', title: 'Переключатель', skill: 'Когнитивная гибкость', icon: '🔄', route: '/games/switcher', tone: 'orange', desc: 'Меняй правило на лету.' },
  { code: 'focus_ribbon', title: 'Фокус-лента', skill: 'Устойчивое внимание', icon: '🎯', route: '/games/focus-ribbon', tone: 'blue', desc: 'Держи внимание до финиша.' }
];

const TG = `<script>(()=>{if(window.__TG_READY)return;window.__TG_READY=new Promise(resolve=>{const ready=()=>{try{const tg=window.Telegram?.WebApp;if(tg){tg.ready();tg.expand()}resolve(tg||null)}catch(_){resolve(null)}};if(window.Telegram?.WebApp){ready();return}const s=document.createElement('script');s.src='https://telegram.org/js/telegram-web-app.js';s.async=true;s.onload=ready;s.onerror=()=>resolve(null);document.head.appendChild(s)});window.getTelegram=()=>window.Telegram?.WebApp||null})()</script>`;

export function renderHomePage() {
  const cards = GAMES.map(g => `<button class="game-card ${g.tone}" data-route="${g.route}">
    <span class="game-icon">${g.icon}</span>
    <span class="game-copy"><b>${esc(g.title)}</b><small>${esc(g.skill)}</small><em>${esc(g.desc)}</em></span>
    <span class="arrow">›</span>
  </button>`).join('');
  const tgScript = TG.replace('<script>', '').replace('</script>', '');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#080f1c">
<title>НейроГерой</title>
<style>
:root{--bg:#080f1c;--panel:#101a2a;--panel2:#142238;--text:#f7fbff;--muted:#93a8bc;--cyan:#20dff5;--violet:#9b67ff;--orange:#ff8128;--yellow:#ffd34d;--green:#35d58a;--line:#ffffff18;--nav:rgba(9,16,29,.9)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{background:var(--bg)}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% -12%,#173d5b 0,#0d1c2e 34%,var(--bg) 70%);color:var(--text);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation}
body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.32;background-image:radial-gradient(circle,#35dff015 1px,transparent 1.5px),radial-gradient(circle,#9b67ff12 1px,transparent 1.5px);background-size:38px 38px,61px 61px;background-position:0 0,17px 11px}
button{font:inherit}.app{width:min(100%,620px);margin:auto;min-height:100vh;padding:calc(12px + env(safe-area-inset-top)) 14px calc(88px + env(safe-area-inset-bottom));position:relative;z-index:1}.top{height:46px;display:flex;align-items:center;justify-content:space-between}.brand{font-size:21px;font-weight:950;letter-spacing:-.05em}.brand i{font-style:normal;color:var(--cyan)}.wallet{display:flex;gap:7px;align-items:center}.pill{border:1px solid var(--line);background:#ffffff09;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900;white-space:nowrap}.coins{color:var(--yellow)}.streak{color:var(--orange)}
.hero{margin-top:8px;border:1px solid #20dff54d;border-radius:27px;padding:18px;background:linear-gradient(145deg,#102a3d 0,#101a2a 58%,#17152d 100%);box-shadow:0 18px 55px #0009;overflow:hidden;position:relative}.hero:after{content:"";position:absolute;width:190px;height:190px;right:-70px;top:-70px;border-radius:50%;background:#20dff516;filter:blur(4px)}.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) 132px;gap:8px;align-items:center}.eyebrow{font-size:10px;letter-spacing:.16em;color:#7cecff;font-weight:950}.hero h1{font-size:clamp(30px,8vw,42px);line-height:.98;margin:7px 0 9px;letter-spacing:-.05em}.hero p{margin:0;color:var(--muted);font-size:13px;line-height:1.42;max-width:350px}.avatar{height:145px;display:grid;place-items:center;position:relative}.avatar:before{content:"";position:absolute;width:132px;height:132px;border-radius:50%;background:radial-gradient(circle,#20dff54c,#9b67ff16 54%,transparent 71%)}.avatar-core{width:79px;height:101px;border-radius:44% 44% 36% 36%;background:linear-gradient(160deg,#1b68d0,#0a1d42 61%,#5625ae);border:2px solid #2ce8ff;box-shadow:0 0 28px #1edfff66;position:relative;z-index:1}.avatar-core:before{content:"";position:absolute;width:47px;height:40px;left:14px;top:-15px;border-radius:50% 50% 43% 43%;background:linear-gradient(145deg,#e7a276,#713b34);border:3px solid #0a1630}.avatar-core:after{content:"✦";position:absolute;right:-11px;bottom:7px;color:var(--orange);font-size:28px;text-shadow:0 0 13px var(--orange)}.goggles{position:absolute;z-index:2;top:49px;left:50%;transform:translateX(-50%);width:78px;height:20px}.goggles:before{content:"";position:absolute;left:0;top:5px;width:78px;height:4px;border-radius:4px;background:var(--orange)}.goggles:after{content:"";position:absolute;left:8px;top:0;width:62px;height:18px;border-radius:5px;background:linear-gradient(90deg,var(--cyan) 0 43%,transparent 43% 57%,var(--cyan) 57% 100%);border:2px solid #fff;box-shadow:0 0 13px #20dff566}
.identity{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px}.identity-card{padding:11px 12px;border:1px solid var(--line);border-radius:15px;background:#ffffff08}.identity-card b{display:block;font-size:12px}.identity-card small{display:block;color:var(--muted);font-size:11px;line-height:1.35;margin-top:3px}
.level{margin-top:13px;padding:12px;border-radius:16px;background:#07111f99;border:1px solid #ffffff14}.level-row{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:900}.level-row span:first-child{color:var(--cyan)}.bar{height:7px;margin-top:7px;background:#1b293a;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--cyan),#55a8ff);border-radius:inherit;transition:width .5s ease}.xp{margin-top:5px;text-align:right;color:var(--muted);font-size:10px}
.section-head{display:flex;align-items:end;justify-content:space-between;margin:21px 2px 10px}.section-head h2{margin:0;font-size:19px;letter-spacing:-.03em}.section-head span{font-size:11px;color:var(--muted)}.games{display:grid;gap:9px}.game-card{width:100%;display:grid;grid-template-columns:50px minmax(0,1fr) 18px;gap:11px;align-items:center;text-align:left;padding:12px;border:1px solid var(--line);border-radius:19px;background:linear-gradient(145deg,#13243a,#0d1725);color:var(--text);cursor:pointer;transition:transform .12s ease,border-color .12s ease}.game-card:active{transform:scale(.982)}.game-icon{width:50px;height:50px;display:grid;place-items:center;border-radius:15px;background:#ffffff0a;font-size:26px}.game-copy{min-width:0}.game-copy b{display:block;font-size:15px}.game-copy small{display:block;color:#7fe9ff;font-size:10px;font-weight:900;margin-top:3px}.game-copy em{display:block;color:var(--muted);font-style:normal;font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.arrow{font-size:29px;color:#6f8498}.cyan .game-icon{box-shadow:inset 0 0 0 1px #20dff555}.violet .game-icon{box-shadow:inset 0 0 0 1px #9b67ff55}.orange .game-icon{box-shadow:inset 0 0 0 1px #ff812855}.blue .game-icon{box-shadow:inset 0 0 0 1px #4da3ff55}
.quest{margin-top:14px;padding:14px;border-radius:19px;border:1px solid #9b67ff44;background:linear-gradient(135deg,#241d42,#131a2a);display:flex;align-items:center;justify-content:space-between;gap:12px}.quest-main{min-width:0}.quest-kicker{color:#bca4ff;font-size:10px;font-weight:950;letter-spacing:.12em}.quest b{display:block;margin-top:4px;font-size:14px}.quest small{display:block;color:var(--muted);margin-top:3px;font-size:11px}.quest-progress{min-width:72px;text-align:right}.quest-progress strong{display:block;color:#d2c2ff;font-size:12px}.quest-bar{height:6px;width:72px;margin-top:7px;background:#ffffff12;border-radius:99px;overflow:hidden}.quest-bar i{display:block;height:100%;background:var(--violet);border-radius:inherit}
.skills{margin-top:14px;padding:14px;border-radius:19px;border:1px solid var(--line);background:#ffffff06}.skills-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.skills-head b{font-size:14px}.skills-head span{font-size:10px;color:var(--cyan);font-weight:900;background:#20dff512;padding:5px 8px;border-radius:99px}.skill{margin-top:10px}.skill:first-child{margin-top:0}.skill-line{display:flex;justify-content:space-between;font-size:11px;font-weight:900}.skill-line span:first-child{color:var(--muted)}.skill-line span:last-child{color:var(--text)}.skill-bar{height:7px;background:#1b293a;border-radius:99px;overflow:hidden;margin-top:5px}.skill-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--cyan),#167b9d)}
.primary{width:100%;margin-top:14px;border:0;border-radius:19px;padding:15px;background:linear-gradient(135deg,#ff8a32,#e75c10);color:#fff;font-size:17px;font-weight:950;box-shadow:0 10px 28px #ff6a2538;cursor:pointer}.primary:active{transform:scale(.985)}.footer{text-align:center;color:#61758a;font-size:10px;margin-top:14px}
.nav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,620px);padding:8px 9px calc(8px + env(safe-area-inset-bottom));background:var(--nav);backdrop-filter:blur(18px);border-top:1px solid var(--line);z-index:10}.nav-inner{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}.nav button{border:0;background:transparent;color:#71859a;padding:5px 2px 3px;border-radius:12px;cursor:pointer}.nav button.active{color:var(--cyan);background:#20dff50b}.nav .ico{display:block;font-size:20px;line-height:21px}.nav small{display:block;font-size:9px;font-weight:900;margin-top:2px}.toast{position:fixed;left:14px;right:14px;bottom:calc(77px + env(safe-area-inset-bottom));padding:12px 14px;border:1px solid #ffffff18;border-radius:15px;background:#17243af2;box-shadow:0 15px 45px #0008;color:#fff;font-size:12px;font-weight:800;z-index:20;display:none}.toast.show{display:block;animation:in .2s ease}@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(max-width:430px){.app{padding-left:12px;padding-right:12px}.hero-grid{grid-template-columns:minmax(0,1fr) 106px}.avatar{transform:scale(.88);transform-origin:right center}.pill{padding:7px 9px}.streak{display:none}.identity-card{padding:10px}}
</style>
</head>
<body>
<main class="app">
<header class="top">
  <div class="brand">Нейро<span>Герой</span></div>
  <div class="wallet"><div class="pill coins">🪙 <span id="coins">—</span></div><div class="pill streak">🔥 <span id="streak">Стрик</span></div></div>
</header>
<section class="hero">
  <div class="hero-grid">
    <div><div class="eyebrow">ТВОЙ ГЕРОЙ</div><h1 id="hello">Привет, Герой!</h1><p>Выбирай игру, прокачивай сильные стороны и ставь личные рекорды.</p></div>
    <div class="avatar"><div class="avatar-core"></div><div class="goggles" id="goggles"></div></div>
  </div>
  <div class="identity">
    <div class="identity-card"><b>🎮 Сегодня</b><small id="today">Твоя тренировка начинается здесь</small></div>
    <div class="identity-card"><b>🧠 Твой профиль</b><small id="profile">Собираем первые результаты</small></div>
  </div>
  <div class="level"><div class="level-row"><span id="level">УРОВЕНЬ 1</span><span id="level-name">Нейрогерой</span></div><div class="bar"><i id="xp-bar" style="width:0%"></i></div><div class="xp" id="xp">0 / 1200 XP</div></div>
</section>
<div class="section-head"><h2>ВО ЧТО ИГРАТЬ</h2><span>4 тренировки</span></div>
<section class="games">${cards}</section>
<button class="primary" id="play">🎮 ИГРАТЬ</button>
<section class="quest"><div class="quest-main"><div class="quest-kicker">КВЕСТ ДНЯ</div><b id="quest-title">Сегодняшняя тренировка</b><small id="quest-text">Сыграй одну тренировку</small></div><div class="quest-progress"><strong id="quest-count">0/1</strong><div class="quest-bar"><i id="quest-bar" style="width:0%"></i></div></div></section>
<section class="skills"><div class="skills-head"><b>Твои навыки</b><span>РОСТ ПО НАВЫКАМ</span></div><div id="skills-list"><div class="skill"><div class="skill-line"><span>Результаты загружаются…</span><span>—</span></div><div class="skill-bar"><i style="width:0%"></i></div></div></div></section>
<div class="footer">Игра всегда на первом месте</div>
</main>
<nav class="nav"><div class="nav-inner">
<button class="active" data-tab="home"><span class="ico">🏠</span><small>Главная</small></button>
<button data-tab="character"><span class="ico">👤</span><small>Герой</small></button>
<button data-tab="games"><span class="ico">🕹️</span><small>Игры</small></button>
<button data-tab="progress"><span class="ico">📊</span><small>Прогресс</small></button>
<button data-tab="more"><span class="ico">•••</span><small>Ещё</small></button>
</div></nav>
<div class="toast" id="toast"></div>
<script>${tgScript}
const escText=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const showToast=(text)=>{const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2600)};
const tg=()=>window.getTelegram?.();
const authHeaders=()=>{const t=tg();const h={'Accept':'application/json'};if(t?.initData)h['x-telegram-init-data']=t.initData;return h};
const setSkills=(skills)=>{const list=document.getElementById('skills-list');if(!Array.isArray(skills)||!skills.length){list.innerHTML='<div class="skill"><div class="skill-line"><span>Пока нет результатов</span><span>—</span></div><div class="skill-bar"><i style="width:0%"></i></div></div>';return}const icons={'Скорость реакции':'⚡','Рабочая память':'🧠','Когнитивная гибкость':'🔄','Устойчивое внимание':'🎯'};list.innerHTML=skills.slice(0,3).map(s=>{const value=s.accuracy==null?0:Math.max(0,Math.min(100,Number(s.accuracy)));return '<div class="skill"><div class="skill-line"><span>'+escText((icons[s.skill_title]||'🧠')+' '+(s.skill_title||s.title))+'</span><span>'+ (s.accuracy==null?'—':value+' / 100') +'</span></div><div class="skill-bar"><i style="width:'+value+'%"></i></div></div>'}).join('')};
const applyProgress=(data)=>{if(!data?.ok)return;const p=data.player||{};const level=Number(p.level||1),xp=Number(p.experience||0),xpMax=1200;document.getElementById('coins').textContent=Number(p.coins||0).toLocaleString('ru-RU');document.getElementById('level').textContent='УРОВЕНЬ '+level;document.getElementById('level-name').textContent=escText(p.character_name||'Нейрогерой');document.getElementById('xp').textContent=(xp%xpMax)+' / '+xpMax+' XP';document.getElementById('xp-bar').style.width=Math.min(100,(xp%xpMax)/xpMax*100)+'%';if(p.first_name)document.getElementById('hello').textContent='Привет, '+escText(p.first_name)+'!';setSkills(data.skills);const q=data.quests?.[0];if(q){document.getElementById('quest-title').textContent=escText(q.title||'Сегодня');document.getElementById('quest-text').textContent=escText(q.text||'Сыграй одну тренировку');document.getElementById('quest-count').textContent=Number(q.progress||0)+'/'+Number(q.goal||1);document.getElementById('quest-bar').style.width=Math.min(100,(Number(q.progress||0)/Math.max(1,Number(q.goal||1)))*100)+'%'}const total=(data.skills||[]).reduce((n,s)=>n+Number(s.sessions||0),0);document.getElementById('profile').textContent=total?'Уже есть '+total+' трениров'+(total%10===1?'ка':(total%10>=2&&total%10<=4?'ки':'ок')):'Собираем первые результаты'};
const loadProgress=async()=>{try{const r=await fetch('/api/progress',{headers:authHeaders(),cache:'no-store'});if(!r.ok)return;const data=await r.json();applyProgress(data)}catch(_){}};
const go=route=>{if(route)location.assign(route)};
document.querySelectorAll('.game-card').forEach(b=>b.addEventListener('click',()=>go(b.dataset.route)));
document.getElementById('play').addEventListener('click',()=>go('/games/lightning'));
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const tab=b.dataset.tab;if(tab==='games')document.querySelector('.games').scrollIntoView({behavior:'smooth',block:'start'});else if(tab==='progress')go('/progress');else if(tab==='character'){document.getElementById('goggles').style.opacity=document.getElementById('goggles').style.opacity==='0'?'1':'0';showToast('Очки героя переключены');}else if(tab==='more'){showToast('Настройки и родительский раздел подключаются отдельными экранами.')}}));
const boot=()=>{const t=tg();try{t?.ready();t?.expand()}catch(_){}if(t?.initDataUnsafe?.user?.first_name)document.getElementById('hello').textContent='Привет, '+escText(t.initDataUnsafe.user.first_name)+'!';loadProgress()};window.__TG_READY?.then(boot);setTimeout(boot,1200);
</script>
</body></html>`;
}

function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
