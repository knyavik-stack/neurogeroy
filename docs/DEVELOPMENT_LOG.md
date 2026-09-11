# Development Log

## 2026-09-11 — Home redesign and Telegram Mini App hardening

### Changed
- Главный экран `/` переведён на новый продуктовый визуальный язык по утверждённому референсу: тёмный sci-fi фон, cyan/blue/violet glow, оранжевая основная кнопка, крупный герой, квест дня, нейрометрики, игровые карточки и нижняя навигация.
- Старый `home_page.js` оставлен тонким совместимым экспортом; фактическая разметка вынесена в `home_page_neon.js`.
- Герой на главной теперь нарисован как встроенный SVG без фоновой фотографии. Фоновая картинка `design/image.jpg` больше не используется на Home.
- Home остаётся адаптивным: desktop-композиция и отдельная мобильная компоновка для Telegram WebView.
- Все игровые CTA ведут на существующие маршруты; кнопка `Играть` запускает `/games/lightning`.
- Данные профиля и квеста продолжают загружаться из `/api/progress` по Telegram `initData`; демонстрационные значения не используются как реальные данные игрока.

### Telegram
- В Home добавлена явная инициализация `Telegram.WebApp`: `ready()`, `expand()`, цвета заголовка/фона и отключение вертикальных свайпов при поддержке метода.
- Сайт и Mini App используют один и тот же Worker URL; отдельная серверная ветка для Telegram не создаётся.
- По официальной документации Telegram Main Mini App должен быть настроен через @BotFather; URL главного Mini App задаётся там, а Telegram открывает его внутри WebView.

### Deployment
- Commit с UI: `a5bcae80db3d78eb549cdda60a01da8259e23426`.
- GitHub Actions syntax run `34623955616` запущен.
- Cloudflare deploy run `34623955599` запущен для того же commit.

### Verification boundary
- CI и Cloudflare deployment должны быть проверены после завершения run.
- Фактический запуск внутри Telegram-клиента из GitHub/Cloudflare подключения недоступен; отдельно требуется проверка Main Mini App entry в @BotFather, если WebView всё ещё не открывается.

## 2026-09-10 — Telegram runtime and navigation stabilization

### Findings
- `wrangler.toml` uses `root_entry.js` as the Worker entrypoint.
- The repository has no deployment workflow: `.github/workflows/` currently contains only the JavaScript syntax workflow. Therefore a Git push does not, by itself, prove that the Cloudflare Worker used by the Telegram bot has been updated.
- The repository does not contain the live Mini App URL, so production Telegram WebView reachability cannot be verified from the GitHub connection alone.
- The previous `root_entry.js` mutated already-rendered HTML and added a second navigation layer. This was unnecessary and could produce duplicate controls.

### Fixed
- Added `/health` endpoint to `main_app.js` for a deployment smoke test without Telegram authorization.
- Added a dedicated `/games` hub with all four current games and a real bottom navigation: Главная / Игры / Прогресс.
- Wired Home's `Игры` tab to `/games` instead of only scrolling inside Home.
- Wired existing Home navigation controls consistently through the canonical router.
- Simplified `root_entry.js` to a transparent compatibility entrypoint that delegates directly to `main_app.js`; it no longer rewrites HTML.
- Internal game/progress pages now use the canonical `‹ К ИГРАМ` return path.

### Verification
- GitHub Actions run `34506969658` for the `root_entry.js` change completed successfully.
- GitHub Actions run `34507001325` for the navigation change reached the JavaScript syntax step successfully; final cleanup was still in progress at the time of this log update.
- Production Telegram WebView smoke-test remains blocked only by the missing live Mini App URL/deployment visibility, not by a missing repository route.

## 2026-09-08 — Lightning rebuilt from ReactionGame.jsx

### Changed
- `games/lightning_v2.js` полностью переписан по поведению из приложенного `ReactionGame.jsx`.
- Сохранена модель из референса: 5 раундов; старт через `Готов`; случайная пауза 1,5–3,5 секунды; ожидание вспышки; 1 цель в раундах 1–2, 2 цели в 3–4, 3 цели в 5; ловушки с вероятностью 15% начиная с 3-го раунда; измерение реакции в миллисекундах; промежуточный результат; финальный экран.
- Визуальная часть переведена в единый digital/neon HUD продукта.
- Сохранение результата оставлено через существующий `/api/game-sessions`.

### Verification
- Новый commit: `f762aee1e1df6243fdcbb4b3a62c3b722bfd7962`.
- Production Telegram WebView smoke-test через подключение не выполнялся.

## 2026-09-08 — Unified neon UI across the application

### Changed
- Принят `Home.jsx` как исходный UI/UX-референс: композиция, игровой приоритет, карточки тренировок и иерархия действий.
- `ReactionGame.jsx` изучен как источник поведения игры «Молния».
- В `main_app.js` добавлен единый neon HUD-слой для Home, Progress и игровых маршрутов.
- Ранее Home использовал `design/image.jpg` как проектный asset героя; в текущем проходе это заменено на встроенного SVG-героя без фоновой фотографии.

### Verification
- Предыдущий GitHub Actions run `34219321483` завершился `success` на шаге JavaScript syntax.
- Production Telegram WebView визуально через это подключение не проверялся.
