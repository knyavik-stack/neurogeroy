import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  const [screen, setScreen] = React.useState<"home" | "game">("home");
  const [status, setStatus] = React.useState("Готов к первой миссии?");
  if (screen === "game") return <main><section className="card"><div className="eyebrow">МИССИЯ · МОЛНИЯ</div><h1>Скоро здесь будет реакция</h1><p>Следующий этап — полноценный игровой цикл.</p><button onClick={() => setScreen("home")}>Назад</button></section></main>;
  return <main><section className="card"><div className="eyebrow">NEUROGEROY · ФАЗА 0</div><h1>Привет, Герой!</h1><p>{status}</p><button onClick={() => { setStatus("Миссия открыта!"); setScreen("game"); }}>Открыть «Молнию»</button></section></main>;
}

createRoot(document.getElementById("root")!).render(<App />);
