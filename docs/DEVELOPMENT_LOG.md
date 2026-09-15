# Development Log

## 2026-09-15 — Unified game shells and Telegram navigation

### Changed
- Игровые маршруты `/games/lightning`, `/games/memory-grid`, `/games/switcher`, `/games/focus-ribbon` получили единый dark sci-fi/neon shell поверх существующей игровой логики.
- Для игровых экранов добавлен компактный переход `‹ ИГРЫ`, чтобы выходить из тренировки непосредственно в `/games`, а не терять пользователя на главной.
- Для Telegram Mini App на игровых маршрутах подключён нативный `Telegram.WebApp.BackButton`: он ведёт в `/games`.
- Кнопки `К играм` и `В меню` внутри старых игровых оболочек нормализованы на `/games`, без изменения механики самих тренировок.
- Визуальные оболочки памяти, переключателя и фокус-ленты приведены к той же системе карточек, границ, glow и оранжевых CTA, что Home и Progress.
- Lightning оставлен без изменения игровой механики и уже использует отдельный более развитый игровой HUD.

### Telegram verification
- Использован официальный API `Telegram.WebApp.BackButton`; Telegram документирует `show()`, `hide()` и `onClick()` для нативной кнопки возврата. См. https://core.telegram.org/bots/webapps.

### Verification boundary
- Commit создан в `main` репозитория `knyavik-stack/neurogeroy`.
- GitHub Actions syntax/deploy запускаются автоматически после push.
- Реальный запуск игры внутри клиента Telegram из текущего подключения не эмулируется; проверяется после deployment на устройстве.

## 2026-09-15 — Functional cleanup after visual pass

### Fixed
- Квест `Сегодня` и `Разминка мозга` в `/api/progress` теперь считают только игровые сессии за текущую календарную дату UTC, а не всю историю игрока.
- Общий HUD больше не содержит ссылку на `design/image.jpg` и не может вернуть удалённую картинку героя через legacy `.avatar`-правило.

### Commits
- Home: `9b5268efd4c574506df7c7d0f260f72b9def759b`.
- Legacy hero override removal: `24afda2eac14db8c8638e7738f2efec3711c54c2`.
- Progress UI: `78d6ffb857ba35aa1745b494ab3fac0f6c47e2a6`.
- Daily quest counting: `e15a0f43e1f09d33300d5b12eba6da4a139301b9`.

### Verification
- Syntax check для Home cleanup: GitHub Actions run `34939253506` — success.
- Syntax check для legacy override cleanup: run `34939286666` — success.
- Syntax check для Progress UI: run `34939326569` — success.
- Cloudflare deploy для Progress UI: run `34939326558` — success.
- Cloudflare deploy для legacy override cleanup: run `34939286777` — success.

## 2026-09-15 — Home compacted and navigation/progress unified

### Changed
- Полностью убрана иллюстрация героя с главного экрана. На Home больше нет SVG/фотографии персонажа и нет отдельной визуальной колонки, занимавшей значительную высоту на мобильных экранах.
- Home переведён на компактную игровую композицию: заголовок → основная кнопка `Играть` → квест → четыре тренировки → уровень/XP.
- На мобильном Home скрывается декоративный desktop-блок `NEURO CORE`, поэтому первый экран не раздувается по высоте.
- `home_page.js` теперь содержит актуальную реализацию Home напрямую; старый `home_page_neon.js` больше не подключается роутером.
- Из общего HUD удалён legacy-стиль, который мог подмешивать `design/image.jpg` через `.avatar:after`.
- Progress полностью переведён на тот же dark sci-fi visual system: компактный профиль, уровень, XP/монеты/тренировки, навыки, достижения, задания и единая нижняя навигация.
- Навигация Home / Игры / Прогресс унифицирована и ведёт на реальные маршруты `/`, `/games`, `/progress`.
- На Home все четыре карточки тренировок ведут напрямую в существующие игровые маршруты.
- Основная кнопка `Играть` ведёт в `/games/lightning`.

### Backend / functional behavior
- Сохранена загрузка реального профиля через `/api/progress` и Telegram `initData`.
- Сохранение игровых результатов через `/api/game-sessions` не менялось.
- `/health` продолжает использоваться как deployment smoke-test и теперь сообщает revision `2026-09-15`.

### Verification boundary
- Изменения сделаны только в репозитории `knyavik-stack/neurogeroy`.
- После push необходимо дождаться GitHub Actions syntax/deploy и проверить production URL в браузере.
- Фактический запуск внутри Telegram-клиента из этого подключения по-прежнему недоступен; если WebView не открывается, отдельно проверяется Main Mini App URL в @BotFather.

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
- GitHub Actions syntax run `34623955516` запущен.
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
