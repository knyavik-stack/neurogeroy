# Development Log

## 2026-09-18 — Telegram game integration and persistence hardening

### Problem
- В Telegram Mini App «Молния» запускалась, но результат мог не сохраняться.
- Остальные три тренировки имели отдельную визуальную систему и отличались от принятого dark sci-fi/neon интерфейса продукта.
- Навигация вторичных экранов через переходы верхнего уровня Telegram WebView оставалась ненадёжной.

### Fixed
- Все четыре игровые страницы и «Прогресс» открываются внутри текущего Mini App через встроенный same-origin экран.
- В родительский экран добавлена передача Telegram initData во встроенную страницу через postMessage.
- Игры используют переданный initData как резервный источник авторизации при сохранении результата.
- Сохранение результатов теперь работает для игры, даже если Telegram WebApp API внутри вложенного документа не предоставляет initData.
- Для «Память-сетка», «Переключатель» и «Фокус-лента» усилена общая визуальная оболочка: тёмный фон, neon-акценты, единые карточки и CTA.
- Навигация «Прогресс» также удерживается внутри Mini App.

### Commits
- `740979bf8b08caa09ef8179729caf6e1b16844e1` — Telegram initData bridge.
- `4f76ef0c964edeba8cd8461c5907cc5d93b97ae5` — Lightning save fallback.
- `e0ba287609cfac64bf0e5ecb04b01e108fe23e18` — Memory save fallback.
- `5a8e96fd536278d4f0feb92e51ad72f4f9bf13db` — Switcher save fallback.
- `063039f0f9b9d87992694584de05956463deb053` — Focus save fallback.
- `476ffbd8bb973656149eb7ecd7c76908a16e5acf` — parent iframe auth handoff.
- `977a0f4a87b640142a68d3787f862af8fd10a010` — unified secondary-game visual shell.

### Verification boundary
- Изменения выполнены только в `knyavik-stack/neurogeroy`.
- Исходный код проверен через GitHub после каждой записи.
- Live-взаимодействие с физическим Telegram-клиентом из текущего подключения недоступно, поэтому оно не выдаётся за выполненный тест.
- После последнего push GitHub Actions должен выполнить syntax check и Cloudflare deploy.

## 2026-09-15 — Telegram navigation hardened: all secondary screens stay inside the Mini App

### Problem
- Previous fix embedded game routes in a same-origin iframe, but Home still opened `/progress` with a top-level `location.assign()`.
- Therefore navigation was not consistently handled by one mechanism inside the Telegram WebView.

### Fixed
- Home now uses the same in-app embedded frame for **all secondary screens**: `/games/lightning`, `/games/memory-grid`, `/games/switcher`, `/games/focus-ribbon` and `/progress`.
- The Telegram native `BackButton` is shown while a secondary screen is open and closes that screen without leaving the Main Mini App.
- The frame has explicit `allow="camera; microphone; geolocation"` and `referrerpolicy="same-origin"` attributes.
- `/games` inside the embedded frame is normalized to `/games/lightning` for backward compatibility.
- Progress actions returning to training use `/#training`, so the parent Home returns directly to the training section.
- The Home overlay remains same-origin and uses the existing game pages without duplicating their code.

### Commits
- `d5184dd8caac2374ec8c861fcbbb8d8e1e0823c0` — keep progress and games inside Mini App.
- `1a6dc4e21e860cc9053b28ad9e653f2d71a971de` — fix progress navigation back to training.

### Verification boundary
- Changes were made only in `knyavik-stack/neurogeroy`.
- GitHub Actions syntax check and Cloudflare deployment must complete for these two commits before calling the production deployment confirmed.
- A real Telegram client/device cannot be operated from this connection, so live interaction inside Telegram is not claimed as tested.

## 2026-09-15 — Previous Telegram game navigation workaround (superseded)

### Root cause found
- Home used `location.assign('/games/...')` for every game launch. Для обычного браузера это работало, но в Telegram WebView полный переход внутри Main Mini App был ненадёжным: пользователь оставался на Home и игровые экраны не открывались.
- Это было ошибкой навигационного слоя, а не игровой логики.

### Fixed at that stage
- Home opened game routes through a same-origin embedded frame inside the current Telegram WebView.
- Supported `/games/lightning`, `/games/memory-grid`, `/games/switcher`, `/games/focus-ribbon` and `/progress` as routes served by the same Worker.
- The separate `/games` screen remained removed and redirected to Home.

### Superseded by
- The 2026-09-15 hardening above, which moved `/progress` into the same embedded navigation layer as games.

## 2026-09-15 — End-to-end game result persistence hardening

### Product flow
- Основной пользовательский контур: Главная → игра → результат → сохранение результата → Прогресс → статистика → возврат к тренировкам.
- При ошибке сохранения результата больше нет принудительной перезагрузки страницы, которая могла повторно запускать экран результата и создавать риск повторной записи.
- Общая оболочка сохраняет исходный POST `/api/game-sessions` и позволяет повторить именно запрос сохранения кнопкой `Повторить сохранение`.
- После успешного повторения ошибка убирается без перезагрузки игры.

### Verification boundary
- Изменение выполнено только в `knyavik-stack/neurogeroy`.
- Последний подтверждённый Cloudflare deploy до этого изменения: GitHub Actions run `34943351858`, deploy job `104296910569` — success.
- Реальный runtime внутри Telegram-клиента из текущего подключения физически не эмулируется.

## 2026-09-15 — Single training hub and functional game stabilization

### Product decision
- Экран `/games` признан дублирующим: Home уже содержит полный набор из четырёх тренировок.
- `/games` больше не является отдельным экраном и теперь делает HTTP redirect на `/`, сохраняя совместимость со старыми ссылками.
- Игровой выход и Telegram `BackButton` возвращают сразу на Home.

### Fixed
- `games/memory_grid_v2.js`: ошибка в раунде больше не вызывает краткий ложный экран результата. Теперь показывается явное состояние `Ошибка. Следующий раунд…`, затем начинается следующий раунд.
- `games_page.js` удалён.
- `home_page_neon.js` удалён.
- `games/switcher_v2.js`: исправлена генерация стимулов так, чтобы реально присутствовали подходящие и неподходящие варианты.

## 2026-09-15 — Functional cleanup after visual pass

### Fixed
- Квест `Сегодня` и `Разминка мозга` в `/api/progress` считают только игровые сессии за текущую календарную дату UTC, а не всю историю игрока.
- Общий HUD больше не содержит ссылку на `design/image.jpg` и не может вернуть удалённую картинку героя через legacy `.avatar`-правило.

## 2026-09-15 — Home compacted and navigation/progress unified

### Changed
- Полностью убрана иллюстрация героя с главного экрана.
- Home переведён на компактную игровую композицию: заголовок → `Играть` → квест → четыре тренировки → уровень/XP.
- Progress переведён на тот же dark sci-fi visual system.
- Все четыре карточки тренировок ведут в реальные игровые маршруты.

## 2026-09-08 — Lightning rebuilt from ReactionGame.jsx

### Changed
- `games/lightning_v2.js` переписан по поведению из приложенного `ReactionGame.jsx`.
- Сохранена модель: 5 раундов; старт через `Готов`; случайная пауза 1,5–3,5 секунды; ожидание вспышки; 1 цель в раундах 1–2, 2 цели в 3–4, 3 цели в 5; ловушки с вероятностью 15% начиная с 3-го раунда; измерение реакции в миллисекундах; промежуточный и финальный результат.
- Сохранение результата выполняется через `/api/game-sessions`.
