const MAX_AUTH_AGE_SECONDS = 60 * 60;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        status: "ok",
        service: "NeuroGeroy API",
        timestamp: new Date().toISOString(),
      });
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/auth/telegram"
    ) {
      try {
        const body = await request.json();
        const initData = body?.initData;

        if (!initData || typeof initData !== "string") {
          return json(
            { ok: false, error: "initData is required" },
            400
          );
        }

        const verified = await validateTelegramInitData(
          initData,
          env.TELEGRAM_BOT_TOKEN
        );

        if (!verified.ok) {
          return json(
            { ok: false, error: verified.error },
            401
          );
        }

        return json({
          ok: true,
          user: verified.user,
          auth_date: verified.authDate,
        });
      } catch {
        return json(
          { ok: false, error: "Invalid request" },
          400
        );
      }
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML, {
        headers: {
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
          "permissions-policy":
            "camera=(), microphone=(), geolocation=()",
        },
      });
    }

    return json(
      { ok: false, error: "Not found" },
      404
    );
  },
};


async function validateTelegramInitData(initData, botToken) {
  if (!botToken) {
    return {
      ok: false,
      error: "Server configuration error",
    };
  }

  const params = new URLSearchParams(initData);

  const receivedHash = params.get("hash");
  const authDateRaw = params.get("auth_date");
  const userRaw = params.get("user");

  if (!receivedHash || !authDateRaw || !userRaw) {
    return {
      ok: false,
      error: "Invalid Telegram initData",
    };
  }

  params.delete("hash");

  const authDate = Number(authDateRaw);

  if (!Number.isFinite(authDate)) {
    return {
      ok: false,
      error: "Invalid auth_date",
    };
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    authDate > now + 60 ||
    now - authDate > MAX_AUTH_AGE_SECONDS
  ) {
    return {
      ok: false,
      error: "Telegram authorization expired",
    };
  }

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value)
    .join("\\n");

  const encoder = new TextEncoder();

  const secretKey = await hmac(
    encoder.encode("WebAppData"),
    encoder.encode(botToken)
  );

  const calculatedHash = await hmac(
    secretKey,
    encoder.encode(dataCheckString)
  );

  const calculatedHashHex = toHex(calculatedHash);

  if (!constantTimeEqual(calculatedHashHex, receivedHash)) {
    return {
      ok: false,
      error: "Invalid Telegram signature",
    };
  }

  let user;

  try {
    user = JSON.parse(userRaw);
  } catch {
    return {
      ok: false,
      error: "Invalid Telegram user",
    };
  }

  if (!user?.id) {
    return {
      ok: false,
      error: "Telegram user not found",
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      username: user.username ?? null,
      language_code: user.language_code ?? null,
    },
    authDate,
  };
}


async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  return crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    data
  );
}


function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}


function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}


function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    }
  );
}


const HTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<title>NeuroGeroy</title>

<style>
:root {
  --bg: #101322;
  --text: #ffffff;
  --muted: #b9c0dc;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  margin: 0;
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, Arial, sans-serif;
}

body {
  touch-action: manipulation;
}

#app {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
}

.card {
  width: min(100%, 520px);
  min-height: 380px;
  padding: 30px;
  border-radius: 30px;
  background: linear-gradient(145deg, #1d233b, #111524);
  box-shadow: 0 24px 80px rgba(0,0,0,.35);
  text-align: center;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: .14em;
  opacity: .65;
  font-weight: 700;
}

h1 {
  margin: 22px 0 14px;
  font-size: clamp(34px, 10vw, 52px);
  line-height: 1.02;
}

p {
  color: var(--muted);
  font-size: 17px;
  line-height: 1.5;
}

button {
  width: 100%;
  margin-top: 14px;
  border: none;
  border-radius: 18px;
  padding: 18px 20px;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
}

.secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,.2);
  color: white;
}

.best {
  margin: 20px 0;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255,255,255,.07);
}

.game {
  min-height: 100vh;
  width: 100%;
  display: grid;
  place-items: center;
  cursor: pointer;
  user-select: none;
}

.waiting {
  background: #101322;
}

.lightning {
  background: #26304c;
}

.game-card {
  text-align: center;
}

.bolt {
  font-size: 110px;
  animation: pulse .35s infinite alternate;
}

@keyframes pulse {
  from { transform: scale(.9); }
  to { transform: scale(1.12); }
}

.warning {
  color: #ffd37a;
}

.small {
  margin-top: 20px;
  font-size: 12px;
  opacity: .5;
}

.auth-status {
  margin-top: 10px;
  font-size: 11px;
  opacity: .45;
}
</style>
</head>

<body>
<div id="app"></div>

<script>
const app = document.getElementById("app");

const MIN_WAIT = 1200;
const MAX_WAIT = 3500;
const STORAGE_KEY = "neurogeroy.lightning.bestReactionMs";

let phase = "home";
let timer = null;
let signalAt = null;
let lastReaction = null;

let best =
  Number(localStorage.getItem(STORAGE_KEY)) || null;

let authenticatedUser = null;


function haptic(type = "light") {
  try {
    const tg = window.Telegram?.WebApp;

    if (!tg?.HapticFeedback) return;

    if (type === "success") {
      tg.HapticFeedback.notificationOccurred("success");
    } else if (type === "error") {
      tg.HapticFeedback.notificationOccurred("error");
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (_) {}
}


function telegramInit() {
  try {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();
    }
  } catch (_) {}
}


async function authenticateTelegram() {
  try {
    const initData =
      window.Telegram?.WebApp?.initData;

    if (!initData) return;

    const response = await fetch(
      "/api/auth/telegram",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ initData }),
      }
    );

    const result = await response.json();

    if (response.ok && result.ok) {
      authenticatedUser = result.user;
      render();
    } else {
      console.warn(
        "Telegram authentication failed",
        result.error
      );
    }
  } catch (error) {
    console.warn(
      "Telegram authentication unavailable",
      error
    );
  }
}


function userName() {
  return (
    authenticatedUser?.first_name ||
    window.Telegram?.WebApp
      ?.initDataUnsafe?.user?.first_name ||
    "Герой"
  );
}


function render() {

  if (phase === "home") {

    app.innerHTML = \`
      <section class="card">

        <div class="eyebrow">
          NEUROGEROY · ПЕРВАЯ МИССИЯ
        </div>

        <h1>Привет, \${userName()}!</h1>

        <p>
          Добро пожаловать в NeuroGeroy.
          Твоя первая миссия проверит скорость реакции.
        </p>

        \${best ? \`
          <div class="best">
            🏆 Лучший результат<br>
            <strong>\${best} мс</strong>
          </div>
        \` : ""}

        <button id="start">
          ⚡ Открыть «Молнию»
        </button>

        <div class="auth-status">
          \${authenticatedUser
            ? "✓ Telegram подтверждён сервером"
            : ""}
        </div>

      </section>
    \`;

    document
      .getElementById("start")
      .onclick = () => {
        haptic("light");
        phase = "intro";
        render();
      };

    return;
  }


  if (phase === "intro") {

    app.innerHTML = \`
      <section class="card">

        <div class="eyebrow">
          МИССИЯ · МОЛНИЯ
        </div>

        <h1>Нажми только после ⚡</h1>

        <p>
          Подожди появления молнии.
          Как только увидишь сигнал —
          нажми как можно быстрее.
        </p>

        <p class="warning">
          Не нажимай раньше времени.
        </p>

        <button id="ready">
          Я готов
        </button>

        <button
          id="back"
          class="secondary"
        >
          Назад
        </button>

      </section>
    \`;

    document
      .getElementById("ready")
      .onclick = startRound;

    document
      .getElementById("back")
      .onclick = () => {
        phase = "home";
        render();
      };

    return;
  }


  if (phase === "waiting") {

    app.innerHTML = \`
      <div
        class="game waiting"
        id="game"
      >
        <div class="game-card">

          <div class="eyebrow">
            ЖДИ СИГНАЛ
          </div>

          <h1>...</h1>

          <p>
            Не нажимай раньше времени
          </p>

        </div>
      </div>
    \`;

    document
      .getElementById("game")
      .onpointerdown = falseStart;

    return;
  }


  if (phase === "lightning") {

    app.innerHTML = \`
      <div
        class="game lightning"
        id="game"
      >
        <div class="game-card">

          <div class="bolt">⚡</div>

          <h1>ЖМИ!</h1>

        </div>
      </div>
    \`;

    document
      .getElementById("game")
      .onpointerdown = reactionClick;

    return;
  }


  if (phase === "result") {

    const message =
      lastReaction < 250
        ? "Невероятная реакция!"
        : lastReaction < 400
        ? "Отличная скорость!"
        : "Хорошая попытка! Можно ещё быстрее.";

    app.innerHTML = \`
      <section class="card">

        <div class="eyebrow">
          РЕЗУЛЬТАТ
        </div>

        <h1>
          \${lastReaction} мс
        </h1>

        <p>
          \${message}
        </p>

        <div class="best">
          🏆 Твой рекорд:
          <strong>\${best} мс</strong>
        </div>

        <button id="again">
          ⚡ Ещё раз
        </button>

        <button
          id="home"
          class="secondary"
        >
          К миссиям
        </button>

      </section>
    \`;

    document
      .getElementById("again")
      .onclick = startRound;

    document
      .getElementById("home")
      .onclick = () => {
        phase = "home";
        render();
      };
  }
}


function startRound() {

  clearTimeout(timer);

  haptic("light");

  phase = "waiting";
  signalAt = null;

  render();

  const delay =
    MIN_WAIT +
    Math.random() *
      (MAX_WAIT - MIN_WAIT);

  timer = setTimeout(() => {

    signalAt = performance.now();

    phase = "lightning";

    haptic("medium");

    render();

  }, delay);
}


function falseStart() {

  clearTimeout(timer);

  signalAt = null;

  haptic("error");

  phase = "intro";

  render();
}


function reactionClick() {

  if (!signalAt) return;

  lastReaction = Math.max(
    1,
    Math.round(
      performance.now() - signalAt
    )
  );

  if (
    !best ||
    lastReaction < best
  ) {
    best = lastReaction;

    localStorage.setItem(
      STORAGE_KEY,
      String(best)
    );
  }

  haptic("success");

  phase = "result";

  render();
}


telegramInit();
render();
authenticateTelegram();
</script>

</body>
</html>
`;
