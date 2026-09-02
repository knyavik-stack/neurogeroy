export function renderMemoryGrid(app, options = {}) {
  const tg = window.Telegram?.WebApp;
  const onExit = options.onExit || (() => {});
  const saveResult = options.saveResult || (async () => null);

  let difficulty = 1;
  let pattern = [];
  let selected = [];
  let phase = "intro";
  let startedAt = 0;

  const haptic = (type) => {
    try {
      if (!tg?.HapticFeedback) return;
      if (type === "success" || type === "error") tg.HapticFeedback.notificationOccurred(type);
      else tg.HapticFeedback.impactOccurred(type || "light");
    } catch (_) {}
  };

  const config = () => {
    if (difficulty <= 2) return { size: 3, count: difficulty + 2, showMs: 850 + difficulty * 150 };
    return { size: 4, count: difficulty + 2, showMs: 1150 };
  };

  const makePattern = () => {
    const c = config();
    const pool = Array.from({ length: c.size * c.size }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, c.count);
  };

  const draw = () => {
    if (phase === "intro") {
      app.innerHTML = `<section class="card"><div class="eyebrow">МИССИЯ · ПАМЯТЬ-СЕТКА</div><h1>Запомни рисунок</h1><p>Клетки загорятся на короткое время. Затем повтори рисунок в правильном порядке.</p><button id="mg-start">Начать</button><button id="mg-back" class="secondary">Назад</button></section>`;
      document.getElementById("mg-start").onclick = start;
      document.getElementById("mg-back").onclick = onExit;
      return;
    }

    if (phase === "memorize" || phase === "play") {
      const c = config();
      const active = phase === "memorize" ? pattern : selected;
      app.innerHTML = `<section class="card"><div class="eyebrow">${phase === "memorize" ? "ЗАПОМИНАЙ" : "ПОВТОРИ РИСУНОК"}</div><h1>${pattern.length} клеток</h1><div id="mg-grid" class="memory-grid" style="--mg-size:${c.size}"></div><p>${phase === "memorize" ? "Смотри внимательно…" : "Нажимай клетки по порядку"}</p></section>`;
      const grid = document.getElementById("mg-grid");
      for (let i = 0; i < c.size * c.size; i++) {
        const b = document.createElement("button");
        b.className = "memory-cell" + (active.includes(i) ? " active" : "");
        b.disabled = phase !== "play";
        b.onclick = () => choose(i);
        grid.appendChild(b);
      }
      return;
    }

    if (phase === "result") {
      const correct = selected.filter((x, i) => x === pattern[i]).length;
      const accuracy = Math.round((correct / pattern.length) * 100);
      const score = Math.round((correct / pattern.length) * 700 + difficulty * 100);
      app.innerHTML = `<section class="card"><div class="eyebrow">РЕЗУЛЬТАТ · ПАМЯТЬ-СЕТКА</div><h1>${score}</h1><p>Точность: ${accuracy}% · Сложность: ${difficulty}</p><div class="best">Правильно: <strong>${correct} / ${pattern.length}</strong></div><button id="mg-again">Следующий раунд</button><button id="mg-home" class="secondary">К миссиям</button></section>`;
      document.getElementById("mg-again").onclick = () => { if (accuracy >= 80 && difficulty < 6) difficulty++; start(); };
      document.getElementById("mg-home").onclick = onExit;
      saveResult({ game_code:"memory_grid", score, difficulty, false_starts:0, accuracy_percent:accuracy }).catch(() => {});
    }
  };

  const start = () => {
    haptic("light");
    pattern = makePattern();
    selected = [];
    phase = "memorize";
    startedAt = performance.now();
    draw();
    setTimeout(() => { phase = "play"; draw(); }, config().showMs);
  };

  const choose = (cell) => {
    if (phase !== "play") return;
    const index = selected.length;
    selected.push(cell);
    if (pattern[index] !== cell) {
      haptic("error");
      phase = "result";
      draw();
      return;
    }
    haptic("light");
    if (selected.length === pattern.length) {
      haptic("success");
      phase = "result";
      draw();
    } else draw();
  };

  draw();
}
