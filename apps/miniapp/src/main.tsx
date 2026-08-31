import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Phase = "home" | "intro" | "waiting" | "lightning" | "result";
const MIN_WAIT = 1200;
const MAX_WAIT = 3500;
const STORAGE_KEY = "neurogeroy.lightning.bestReactionMs";

function App() {
  const [phase, setPhase] = React.useState<Phase>("home");
  const [reaction, setReaction] = React.useState<number | null>(null);
  const [best, setBest] = React.useState<number | null>(() => {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? Number(value) : null;
  });
  const signalAt = React.useRef<number | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  function startRound() {
    setReaction(null);
    setPhase("waiting");
    const delay = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
    timeoutRef.current = window.setTimeout(() => {
      signalAt.current = performance.now();
      setPhase("lightning");
    }, delay);
  }

  function react() {
    if (phase === "waiting") {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      signalAt.current = null;
      setPhase("intro");
      return;
    }
    if (phase !== "lightning" || signalAt.current === null) return;
    const ms = Math.max(1, Math.round(performance.now() - signalAt.current));
    setReaction(ms);
    const currentBest = best === null ? ms : Math.min(best, ms);
    if (currentBest !== best) {
      setBest(currentBest);
      localStorage.setItem(STORAGE_KEY, String(currentBest));
    }
    setPhase("result");
  }

  if (phase === "home") {
    return <main><section className="card">
      <div className="eyebrow">NEUROGEROY · ФАЗА 0</div>
      <h1>Привет, Герой!</h1>
      <p>Первая миссия проверит скорость твоей реакции.</p>
      {best !== null && <div className="best">Лучший результат: {best} мс</div>}
      <button onClick={() => setPhase("intro")}>Открыть «Молнию»</button>
    </section></main>;
  }

  if (phase === "intro") {
    return <main><section className="card">
      <div className="eyebrow">МИССИЯ · МОЛНИЯ</div>
      <h1>Нажми только после ⚡</h1>
      <p>Не торопись: ложный старт не засчитывается. Когда появится молния — нажми как можно быстрее.</p>
      <button onClick={startRound}>Я готов</button>
      <button className="secondary" onClick={() => setPhase("home")}>Назад</button>
    </section></main>;
  }

  if (phase === "waiting") {
    return <main className="game waiting" onPointerDown={react}>
      <section className="game-card">
        <div className="eyebrow">ЖДИ СИГНАЛ</div>
        <h1>...</h1>
        <p>Не нажимай раньше времени.</p>
      </section>
    </main>;
  }

  if (phase === "lightning") {
    return <main className="game lightning" onPointerDown={react}>
      <section className="game-card">
        <div className="bolt">⚡</div>
        <h1>ЖМИ!</h1>
      </section>
    </main>;
  }

  return <main><section className="card">
    <div className="eyebrow">РЕЗУЛЬТАТ</div>
    <h1>{reaction} мс</h1>
    <p>{reaction && reaction < 300 ? "Молниеносно!" : reaction && reaction < 500 ? "Отличная реакция!" : "Хорошая попытка — попробуй ещё раз!"}</p>
    {best !== null && <div className="best">Твой лучший результат: {best} мс</div>}
    <button onClick={startRound}>Ещё раз</button>
    <button className="secondary" onClick={() => setPhase("home")}>К миссиям</button>
  </section></main>;
}

createRoot(document.getElementById("root")!).render(<App />);