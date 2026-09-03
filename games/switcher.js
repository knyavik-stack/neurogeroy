const CONFIG = {
  1: { rounds: 18, changeEvery: 6, responseMs: 1800, distractors: false },
  2: { rounds: 22, changeEvery: 5, responseMs: 1500, distractors: true },
  3: { rounds: 26, changeEvery: 4, responseMs: 1250, distractors: true },
  4: { rounds: 30, changeEvery: 3, responseMs: 1050, distractors: true },
  5: { rounds: 34, changeEvery: 3, responseMs: 900, distractors: true },
  6: { rounds: 38, changeEvery: 2, responseMs: 800, distractors: true },
};

const RULES = [
  { id: "blue", label: "Нажимай только на СИНИЕ", test: x => x.color === "blue" },
  { id: "round", label: "Нажимай только на КРУГЛЫЕ", test: x => x.shape === "round" },
];

const COLORS = ["blue", "yellow"];
const SHAPES = ["round", "square"];

function rand(list) { return list[Math.floor(Math.random() * list.length)]; }
function makeStimulus() { return { color: rand(COLORS), shape: rand(SHAPES) }; }
function makeTarget(rule) {
  for (let i = 0; i < 20; i++) {
    const x = makeStimulus();
    if (rule.test(x)) return x;
  }
  return rule.id === "blue" ? { color: "blue", shape: "square" } : { color: "yellow", shape: "round" };
}

export function renderSwitcherHtml() {
  return `<!doctype html><html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<title>NeuroGeroy · Переключатель</title>
<style>
:root{--bg:#101322;--card:#1b2035;--text:#fff;--muted:#b9c0dc}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,Arial,sans-serif}#app{min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(100%,520px);padding:28px;border-radius:30px;background:linear-gradient(145deg,#1d233b,#111524);text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.35)}h1{font-size:clamp(30px,8vw,44px)}p{color:var(--muted);line-height:1.5}.eyebrow{font-size:12px;letter-spacing:.14em;opacity:.65;font-weight:700}.stimulus{width:190px;height:190px;margin:24px auto;border-radius:24px;display:grid;place-items:center;background:#27304b}.shape{width:110px;height:110px}.round{border-radius:50%}.square{border-radius:16px}.blue{background:#5da9ff}.yellow{background:#ffd75e}.rule{padding:13px;border-radius:14px;background:rgba(255,255,255,.07);font-weight:800}.stats{display:flex;justify-content:space-between;color:var(--muted);font-size:13px}button{width:100%;margin-top:14px;border:0;border-radius:18px;padding:17px;font-size:17px;font-weight:800}.secondary{background:transparent;border:1px solid rgba(255,255,255,.2);color:#fff}.good{outline:5px solid rgba(100,255,180,.3)}.bad{outline:5px solid rgba(255,100,120,.3)}
</style></head><body><div id="app"></div><script>
const app=document.getElementById("app"),tg=window.Telegram?.WebApp;try{tg?.ready();tg?.expand()}catch(_){}
const C=${JSON.stringify(CONFIG)},R=${JSON.stringify(RULES.map(r=>({id:r.id,label:r.label})))},COL=${JSON.stringify(COLORS)},SH=${JSON.stringify(SHAPES)};
let d=1,round=0,ruleIndex=0,correct=0,errors=0,changeErrors=0,changes=0,phase="intro",roundStarted=0,adaptation=[],timer=null,saved=false,current=null,changedAt=null;
const cfg=()=>C[d]||C[1];
const rule=()=>R[ruleIndex];
const test=x=>rule().id==="blue"?x.color==="blue":x.shape==="round";
const rand=a=>a[Math.floor(Math.random()*a.length)];
const stimulus=()=>({color:rand(COL),shape:rand(SH)});
const target=()=>{for(let i=0;i<30;i++){const x=stimulus();if(test(x))return x}return rule().id==="blue"?{color:"blue",shape:"square"}:{color:"yellow",shape:"round"}};
function h(t){try{if(t==="success"||t==="error")tg?.HapticFeedback?.notificationOccurred(t);else tg?.HapticFeedback?.impactOccurred(t||"light")}catch(_) {}}
function render(){
 if(phase==="intro"){app.innerHTML='<section class="card"><div class="eyebrow">МИССИЯ · ПЕРЕКЛЮЧАТЕЛЬ</div><h1>Меняй правило</h1><p>Сначала ищи нужный цвет. Внезапно правило сменится — и нужно быстро перестроиться.</p><button id="start">Начать</button><button id="back" class="secondary">К миссиям</button></section>';document.getElementById("start").onclick=begin;document.getElementById("back").onclick=()=>location.href="/";return}
 if(phase==="play"){const elapsed=Math.round(performance.now()-roundStarted);app.innerHTML='<section class="card"><div class="eyebrow">ПЕРЕКЛЮЧАТЕЛЬ · УРОВЕНЬ '+d+'</div><div class="rule">'+rule().label+'</div><div class="stimulus"><div class="shape '+current.color+' '+current.shape+'"></div></div><div class="stats"><span>Раунд '+round+'/'+cfg().rounds+'</span><span>Точность '+Math.round(correct/Math.max(1,round-1)*100)+'%</span><span>Ошибки '+errors+'</span></div><button id="yes">Нажать</button></section>';document.getElementById("yes").onclick=click;return}
 const accuracy=Math.round(correct/cfg().rounds*100),avgAdapt=adaptation.length?Math.round(adaptation.reduce((a,b)=>a+b,0)/adaptation.length):0,score=Math.max(0,Math.round(accuracy*7+d*50-errors*20));app.innerHTML='<section class="card"><div class="eyebrow">РЕЗУЛЬТАТ · ПЕРЕКЛЮЧАТЕЛЬ</div><h1>'+score+'</h1><p>Точность: '+accuracy+'% · Ошибки: '+errors+'</p><div class="rule">Средняя адаптация после смены: '+(avgAdapt/1000).toFixed(1)+' с</div><button id="again">Следующий раунд</button><button id="home" class="secondary">К миссиям</button></section>';document.getElementById("again").onclick=()=>{if(accuracy>=85&&d<6)d++;begin()};document.getElementById("home").onclick=()=>location.href="/";save(score,accuracy,avgAdapt)}
function begin(){clearTimeout(timer);saved=false;round=0;correct=0;errors=0;changeErrors=0;changes=0;adaptation=[];ruleIndex=0;phase="play";nextRound();}
function nextRound(){round++;if(round>cfg().rounds){phase="result";render();return}if(round>1&&((round-1)%cfg().changeEvery===0)){ruleIndex=ruleIndex?0:1;changes++;changedAt=performance.now()}current=target();roundStarted=performance.now();h("light");render();timer=setTimeout(()=>{errors++;if(changedAt&&roundStarted>=changedAt){changeErrors++;}nextRound()},cfg().responseMs)}
function click(){if(phase!=="play")return;const elapsed=performance.now()-roundStarted;const ok=test(current);if(ok){correct++;if(changedAt){adaptation.push(Math.round(elapsed));changedAt=null}h("success");}else{errors++;if(changedAt){changeErrors++;adaptation.push(Math.round(elapsed));changedAt=null}h("error")}nextRound()}
async function save(score,accuracy,avgAdapt){if(saved)return;saved=true;const initData=tg?.initData;if(!initData)return;const duration=Math.max(1,Math.round(performance.now()-roundStarted));try{await fetch("/api/game-sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,game_code:"switcher",score,difficulty:d,false_starts:0,accuracy_percent:accuracy,duration_ms:duration,error_count:errors,input_timing_ms:adaptation})})}catch(_){saved=false}}
render();
</script></body></html>`;
}
