# Development Log

## 2026-09-15 — Functional game pass

### Fixed
- `games/switcher_v2.js`: исправлена генерация стимулов. Ранее функция `make()` фактически могла выдавать только совпадающие с правилом фигуры; теперь отдельно генерируются `matching` и `nonMatching` варианты, поэтому механика «нажми / не нажимай» действительно работает.
- `root_entry.js`: для «Молнии» добавлена визуальная вспышка в момент появления цели.
- `root_entry.js`: для «Молнии» добавлен учёт ложных стартов на уровне оболочки и передача `false_starts` в сохранение результата.
- Игровая навигация в Telegram теперь использует нативный `Telegram.WebApp.BackButton`; веб-версия сохраняет собственную компактную кнопку `‹ ИГРЫ`, но в Telegram она скрыта, чтобы не дублировать системную кнопку.
- Внутренние кнопки `К играм` / `В меню` на игровых экранах ведут в `/games`.

### Verification
- JavaScript syntax workflow `34940543913` — success.
- Cloudflare deploy workflow `34940543986` — запущен; на момент записи deployment step выполняется.
- Изменения находятся только в `knyavik-stack/neurogeroy`.

## 2026-09-15 — Unified game shells and Telegram navigation

### Changed
- Игровые маршруты `/games/lightning`, `/games/memory-grid`, `/games/switcher`, `/games/focus-ribbon` получили единый dark sci-fi/neon shell поверх существующей игровой логики.
- Для игровых экранов добавлен компактный переход `‹ ИГРЫ`, чтобы выходить из тренировки непосредственно в `/games`.
- Для Telegram Mini App на игровых маршрутах подключён нативный `Telegram.WebApp.BackButton`: он ведёт в `/games`.
- Кнопки `К играм` и `В меню` внутри игровых оболочек нормализованы на `/games`.
- Визуальная оболочка памяти, переключателя и фокус-ленты приведена к той же системе карточек, границ, glow и оранжевых CTA, что Home и Progress.
- Lightning использует отдельный игровой HUD; игровой shell добавляет общие навигационные и визуальные элементы.

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
- Syntax check для Home cleanup: run `34939253506` — success.
- Syntax check для legacy override cleanup: run `34939286666` — success.
- Syntax check для Progress UI: run `34939326569` — success.
- Cloudflare deploy для Progress UI: run `34939326558` — success.
- Cloudflare deploy для legacy override cleanup: run `34939286777` — success.

## 2026-09-15 — Home compacted and navigation/progress unified

### Changed
- Полностью убрана иллюстрация героя с главного экрана. На Home больше нет SVG/фотографии персонажа и нет отдельной визуальной колонки, занимавшей значительную высоту на мобильных экранах.
- Home переведён на компактную игровую композицию: заголовок → основная кнопка `Играть` → квест → четыре тренировки → уровень/XP.
- На мобильном Home скрывается декоративный desktop-блок `NEURO CORE`.
- `home_page.js` содержит актуальную реализацию Home напрямую; старый `home_page_neon.js` больше не подключается роутером.
- Из общего HUD удалён legacy-стиль, который мог подмешивать `design/image.jpg` через `.avatar:after`.
- Progress переведён на тот же dark sci-fi visual system.
- Навигация Home / Игры / Прогресс унифицирована и ведёт на `/`, `/games`, `/progress`.
- Все четыре карточки тренировок ведут в реальные игровые маршруты.
- Основная кнопка `Играть` ведёт в `/games/lightning`.

### Backend / functional behavior
- Сохранена загрузка реального профиля через `/api/progress` и Telegram `initData`.
- Сохранение игровых результатов через `/api/game-sessions` не менялось.
- `/health` сообщает revision `2026-09-15`.

### Verification boundary
- Изменения сделаны только в `knyavik-stack/neurogeroy`.
- После push необходимо дождаться GitHub Actions syntax/deploy и проверить production URL в браузере.
- Фактический запуск внутри Telegram-клиента из этого подключения недоступен; если WebView не открывается, отдельно проверяется Main Mini App URL в @BotFather.

## 2026-09-11 — Home redesign and Telegram Mini App hardening

### Changed
- Главный экран `/` переведён на новый продуктовый визуальный язык: тёмный sci-fi фон, cyan/blue/violet glow, оранжевая основная кнопка, квест дня, нейрометрики, игровые карточки и нижняя навигация.
- Старый `home_page.js` оставлен тонким совместимым экспортом; фактическая разметка была вынесена в `home_page_neon.js`.
- Герой на главной был нарисован как встроенный SVG без фоновой фотографии.
- Home оставался адаптивным для Telegram WebView.
- Все игровые CTA вели на существующие маршруты; кнопка `Играть` запускала `/games/lightning`.
- Данные профиля и квеста загружались из `/api/progress` по Telegram `initData`.

### Telegram
- В Home была добавлена инициализация `Telegram.WebApp`: `ready()`, `expand()` и связанные UI-настройки.
- Сайт и Mini App используют один Worker URL.
- Main Mini App должен быть настроен через @BotFather.

### Deployment
- Commit с UI: `a5bcae80db3d78eb549cdda60a01da8259e23426`.
- GitHub Actions syntax run `34623955516`.
- Cloudflare deploy run `34623955599`.

### Verification boundary
- Фактический запуск внутри Telegram-клиента из GitHub/Cloudflare подключения недоступен.

## 2026-09-10 — Telegram runtime and navigation stabilization

### Findings
- `wrangler.toml` использует `root_entry.js` как Worker entrypoint.
- Был добавлен deployment workflow, чтобы push в `main` приводил к Cloudflare deployment.
- Production Telegram WebView reachability нельзя доказать только через GitHub connection.
- Предыдущий `root_entry.js` мог создавать второй слой навигации; текущая версия использует его только как совместимый Worker wrapper для игровых маршрутов.

### Fixed
- Добавлен `/health` endpoint в `main_app.js` для deployment smoke-test без Telegram authorization.
- Добавлен `/games` hub с четырьмя играми и нижней навигацией.
- Home `Игры` ведёт на `/games`.
- Навигация игровых и progress страниц приведена к каноническим маршрутам.

## 2026-09-08 — Lightning rebuilt from ReactionGame.jsx

### Changed
- `games/lightning_v2.js` переписан по поведению из приложенного `ReactionGame.jsx`.
- Сохранена модель: 5 раундов; старт через `Готов`; случайная пауза 1,5–3,5 секунды; ожидание вспышки; 1 цель в раундах 1–2, 2 цели в 3–4, 3 цели в 5; ловушки с вероятностью 15% начиная с 3-го раунда; измерение реакции в миллисекундах; промежуточный и финальный результат.
- Сохранение результата выполняется через `/api/game-sessions`.

### Verification
- Commit: `f762aee1e1df6243fdcbb4b3a62c3b722bfd7962`.
- Production Telegram WebView smoke-test не выполнялся.

## 2026-09-08 — Unified neon UI across the application

### Changed
- `Home.jsx` использован как исходный UI/UX-референс.
- `ReactionGame.jsx` использован как источник поведения игры «Молния».
- В `main_app.js` добавлен единый neon HUD-слой для Home, Progress и игровых маршрутов.
- Ранее Home использовал `design/image.jpg`; затем это было заменено на встроенный SVG-герой, а позднее герой полностью убран с Home.

### Verification
- Предыдущий GitHub Actions run `34219321483` завершился `success` на шаге JavaScript syntax.
- Production Telegram WebView визуально через это подключение не проверялся.
