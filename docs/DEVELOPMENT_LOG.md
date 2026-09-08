# Development Log

## 2026-09-08 — Unified neon UI across the application

### Changed
- Принят `Home.jsx` как исходный UI/UX-референс: композиция, игровой приоритет, карточки тренировок и иерархия действий.
- `ReactionGame.jsx` изучен как источник поведения игры «Молния»: 5 раундов, ожидание сигнала, неоновая цель, реакция в миллисекундах, ранние нажатия, итоговые метрики. Это поведение не заменяется редизайном.
- В `main_app.js` добавлен единый neon HUD-слой для Home, Progress и всех игровых маршрутов: тёмный digital-фон, нейросеточная сетка, cyan/violet/orange glow, тонкие HUD-контуры, единая типографика и безопасная мобильная навигация.
- Главный экран теперь использует реальный проектный asset `design/image.jpg` как символ героя вместо ранее нарисованного SVG-аватара.
- Убраны старые декоративные элементы, которые конфликтовали с новым цифровым стилем.
- Для внутренних экранов добавлена единая кнопка возврата в игровой хаб.
- Сохранены реальные backend-данные и существующие маршруты игр; визуальный слой не подменяет серверную логику.

### Important
- `design/image.jpg` является источником изображения героя. На Home он подключён как проектный asset через raw-ресурс репозитория, потому что Worker сейчас не имеет отдельного static-assets binding в `wrangler.toml`.
- Статические значения из исходного `Home.jsx` (`12450` монет, `12` уровень, `850 XP`, `72/58/81`) не используются как реальные данные игрока.

### Verification
- Предыдущий GitHub Actions run `34219321483` для commit `d4a301f9c02d0729f6e8d3d04eaf43b67d9c7716` завершился `success` на шаге JavaScript syntax.
- После текущих изменений требуется новый CI run для commit `09565551f1b23f5b03b88eb02809700784c0ba66`.
- Production Telegram WebView визуально через это подключение не проверялся.

## 2026-09-08 — Home UI: full neon/neural rebuild

### Changed
- Полностью заменён предыдущий визуальный слой `home_page.js`; старый плоский интерфейс больше не используется на `/`.
- Home переработан как цифровой HUD: нейросеточная сетка, scan-line, glow, тонкие контуры, моноширинные системные подписи, cyan/violet/orange neon-акценты и компактная иерархия.
- Убраны декоративные элементы, которые не поддерживаются текущим backend: streak, фальшивое начисление монет, локальное изменение XP/уровня, локальная кастомизация персонажа.
- Все значения игрока на Home теперь загружаются из существующего `/api/progress`: имя, уровень, опыт, монеты, статистика тренировок и квест.
- Кнопка `ИГРАТЬ` ведёт в существующую рабочую тренировку Lightning; карточки ведут только на существующие игровые маршруты.
- Метрики Home используют реальные `best_accuracy_percent` из `/api/progress`; отсутствующие результаты показываются как `—`, без подстановки выдуманных чисел.
- Нижняя навигация сокращена до реально используемых разделов: Главная, Игры, Прогресс, Ещё.
- Сохранён Telegram WebApp bootstrap из `main_app.js`; Home отправляет `x-telegram-init-data` при загрузке прогресса.

### Product/UI boundary
- `Home.jsx` остаётся исходным референсом композиции и игрового потока, но визуальный слой намеренно переведён в более цифровой/neon HUD.
- Серверные игровые награды, XP и монеты не эмулируются на клиенте.
- Персонаж является визуальным представлением; серверная система косметики отдельно не добавлялась.

### Verification boundary
- Коммит: `d4a301f9c02d0729f6e8d3d04eaf43b67d9c7716`.
- Код интегрирован в `main` репозитория `knyavik-stack/neurogeroy`.
- Production/Telegram WebView визуальный smoke-test этим подключением не выполнялся.

## 2026-09-08 — Canonical entrypoint and Telegram recovery

### Fixed
- `main_app.js` owns `/`, all four enabled game routes, `/progress`, `/api/progress` and delegates persistence POST to `worker_entry.js`.
- `games/lightning_v2.js` is a 5-round session with average reaction, false-start count, completion and per-round timing persistence.
- Added asynchronous Telegram SDK bootstrap.
- `worker.js` remains a compatibility entrypoint for the canonical app.
- `wrangler.toml` points at `root_entry.js`, which wraps the canonical app.
- All result writes continue through `/api/game-sessions` and the normalized Supabase RPC.

### Verification
- Historical local syntax checks passed for the stabilization pass.
- GitHub Actions validation is required after subsequent commits.
- Real Telegram WebView and Cloudflare production deployment are not exposed by this connection.

## 2026-09-07 — Audit V2/V3 corrective pass

### Fixed
- Normalized `record_game_session` to one 15-parameter contract and removed legacy RPC overloads from the live database.
- Verified RPC permissions: `public`, `anon`, and `authenticated` cannot execute `record_game_session`; only `service_role` can.
- Added reproducible repository migrations for RPC cleanup and Lightning route alignment.
- Added centralized result-save error handling.
- Extended Memory Grid v2 to an 8-round session with aggregate metrics and input timings.

### Verification
- Transactional Supabase persistence smoke test passed and was rolled back, leaving no test player/session rows.
- Historical migration drift remains documented and was not rewritten retroactively.
- Server-side anti-cheat/recalculation remains unresolved.
