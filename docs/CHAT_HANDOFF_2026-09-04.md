# NeuroGeroy — полный handoff для нового чата

Дата: 2026-09-04
Проект: NeuroGeroy
Репозиторий: `knyavik-stack/neurogeroy`
Ветка: `main`
Домен: `neurogeroy.ru`
Платформа: Telegram Mini App + Telegram bot
Backend: Cloudflare Worker + Supabase

---

## 0. Как работать с этим документом

Это operational handoff. Новый чат должен сначала прочитать этот файл и связанные документы в `docs/`, затем проверить фактическое состояние `main` и только после этого менять код.

Главное правило: не начинать новый цикл проектирования с нуля и не заставлять владельца проекта повторять уже известный контекст.

Владелец проекта ожидает самостоятельное выполнение работы, минимальную болтовню и реальный результат. Если действие возможно через подключённые инструменты — выполнять его, а не просить владельца делать его вручную. Если действие невозможно, давать одну короткую точную инструкцию.

---

## 1. Продуктовая суть

NeuroGeroy — личная игра в Telegram, в которой игрок прокачивает персонажа и одновременно тренирует конкретные когнитивные навыки.

Основная аудитория: дети 9–13 лет. Родитель — плательщик/контролёр и получает понятную прозрачность по занятиям.

Тренируемые навыки:
- скорость реакции;
- рабочая/краткосрочная память;
- устойчивость внимания;
- быстрое переключение между задачами;
- распознавание закономерностей;
- разделённое внимание.

Принципы:
1. Игра прежде всего.
2. Только честные измеримые обещания.
3. Усиливаем сильные стороны, а не «чинить слабости».
4. Игрок свободно выбирает путь.
5. Ценность должна ощущаться быстро.
6. Родитель понимает, чем занимается ребёнок.
7. Минимум данных, безопасность, никаких тёмных паттернов.

Нельзя обещать повышение IQ, школьных оценок, защиту от деменции/проблем памяти, «научно доказанный» результат, гарантированный результат или «лучший тренажёр мозга». Это зафиксировано в Product Positioning & Messaging.

Основной источник продуктовой правды: `01_Vision_Product_Concept.docx`.
Фильтр коммуникаций: `02_Product_Positioning_Messaging.docx`.
Граница MVP: `04_PRD.docx`.
Правила мини-игр: `05_GDD.docx`.

---

## 2. MVP и критерий готовности

PRD фиксирует Must-функции:
- Telegram Mini App + бот;
- быстрое создание персонажа;
- минимум 5–6 мини-игр по плану, из них минимум 4 полностью рабочие для закрытого теста;
- уровни + опыт;
- монеты;
- достижения;
- ежедневные квесты;
- экран «Мой прогресс»;
- сохранение прогресса после закрытия;
- работа внутри Telegram на iOS и Android;
- минимальный родительский слой.

Для MVP нельзя добавлять новые «крутые» функции, пока Must-функции нестабильны.

GDD: партия должна занимать примерно 40–90 секунд, правила понятны за несколько секунд, ошибка не должна жёстко наказываться, сложность растёт плавно, после партии должен быть понятный результат.

---

## 3. Текущая архитектура

### 3.1 GitHub

Репозиторий: `knyavik-stack/neurogeroy`.
Рабочая ветка: `main`.
Cloudflare подключён к GitHub и настроен на автоматический deploy production branch. При push в production branch Cloudflare должен запускать build/deploy, но через текущий инструмент Cloudflare build logs недоступны.

### 3.2 Cloudflare

Worker: `neurogeroy`.
Конфигурация `wrangler.toml`:
- `name = "neurogeroy"`
- `main = "root_entry.js"`
- compatibility date `2026-09-01`
- observability enabled.

Важно: текущий чат не имеет Cloudflare connector. Нельзя утверждать, что конкретный commit уже реально развернут в production, если это не подтверждено отдельным smoke test или Cloudflare log.

### 3.3 Supabase

Project ID: `lebdwuyjwshcuzxflxmm`.
Регион: `eu-west-1`.
PostgreSQL: 17.6.

RLS включён на:
- `players`
- `game_sessions`
- `games`

Это намеренно. Публичный/anon прямой доступ закрыт; серверный Worker использует secret/service-role.

Ключевая RPC: `record_game_session`.
Она была реально протестирована: создаёт/обновляет player/stat записи, тестовый игрок после проверки был удалён.

Критическая деталь: статистика, которую пишет RPC, находится в `player_game_stats`, а не в `player_game_analytics`. Старый Progress читал не ту таблицу — это была одна из причин пустого прогресса.

### 3.4 Зарегистрированные игры в `public.games`

Включены:
1. `lightning` — «Молния», skill: reaction, route `/`, sort 10.
2. `memory_grid` — «Память-сетка», skill: working_memory, route `/games/memory-grid`, sort 20.
3. `switcher` — «Переключатель», skill: cognitive_flexibility, route `/games/switcher`, sort 30.
4. `focus_ribbon` — «Фокус-лента», skill: sustained_attention, route `/games/focus-ribbon`, sort 40.

Выключены:
- `pattern`
- `dual_stream`

История выключенных игр не удаляется; отключение должно делаться через `games.enabled`.

---

## 4. Основные файлы и их роль

### `worker.js`

Старый полный legacy Worker с оригинальной реализацией «Молнии», около 769 строк в исходном состоянии.
Есть `backup_worker.js` как резерв.

**Не перезаписывать без крайней необходимости.** Перед структурным изменением сначала сделать backup/tag/branch и сохранить точную исходную версию.

### `backup_worker.js`

Резерв оригинальной Lightning реализации.

### `worker_entry.js`

Интеграционный/router слой старой архитектуры.
Содержит:
- статический каталог игр;
- `/api/games` с Supabase/fallback;
- memory-grid legacy route;
- switcher route старой версии;
- `/api/game-sessions` с проверкой Telegram initData и вызовом Supabase RPC;
- старую инъекцию каталога на главную страницу.

Именно старая инъекция каталога с глобальным `MutationObserver` была одной из причин дублей кнопок и лишней DOM-нагрузки.

### `root_entry.js`

Текущий основной entrypoint из `wrangler.toml`.
Импортирует:
- `worker_entry.js`
- `telegram_auth.js`
- `progress_page.js`
- `games/focus_ribbon_v2.js`
- `games/switcher_v2.js`

Перехватывает:
- `/progress` → прямой `renderProgressPage()`;
- `/api/progress` → Progress API;
- `/games/focus-ribbon` → v2;
- `/games/switcher` → v2;
- `/games/memory-grid` → изолированная v2 Memory Grid;
- остальные маршруты передаёт legacy app.

На `/` удаляется legacy скрипт каталога/MutationObserver и устанавливается лёгкая навигация.

### `progression_entry.js`

Старый progression/API entrypoint. Оставлен в проекте для API-логики, но `/progress` больше не должен зависеть от него как от отдельного вложенного HTML entrypoint.

### `progress_entry.js`

Исторически проблемный файл. Был повреждён/обрезан и содержал parse/runtime проблемы; это участвовало в Cloudflare 1101.
Не использовать его как UI entrypoint.

### `progress_page.js`

Текущий самостоятельный UI «Мой прогресс».
Показывает:
- имя/персонажа;
- уровень;
- XP;
- монеты;
- навыки;
- количество игр;
- точность;
- лучший счёт;
- достижения;
- ежедневные задания;
- кнопку возврата в игру.

Получает данные из `/api/progress` и передаёт `X-Telegram-Init-Data`.

### `games/focus_ribbon_v2.js`

Оптимизированная изолированная «Фокус-лента».

Уровни 1–6:
- 40–80 раундов;
- 1100–700 ms на стимул;
- ◆ = единственная цель;
- ● = нейтральный стимул;
- ★ = отвлекающий стимул с уровня 3;
- ★ никогда не является целью.

Метрики:
- hits;
- misses;
- false hits;
- correct rejections;
- errors;
- input timing;
- accuracy;
- score.

Результат сохраняется через `/api/game-sessions`.

### `games/switcher_v2.js`

Оптимизированный «Переключатель».

Правило чередуется:
- COLOR;
- SHAPE.

Игрок нажимает только на стимул, соответствующий текущему правилу; если не соответствует — ждёт.

Метрики:
- hits;
- correct rejections;
- misses;
- false hits;
- errors;
- rule changes;
- adaptation latency;
- accuracy;
- score.

Результат сохраняется через `/api/game-sessions`.

### `games/memory_grid.js`

Изолированная Memory Grid реализация.
Механика: сначала показывается набор клеток, затем игрок воспроизводит выбранные клетки **в правильном порядке**. Первая неправильная клетка завершает раунд как ошибка.

### `telegram_auth.js`

Telegram initData validation. Не ослаблять серверную проверку ради удобства клиента.

---

## 5. Что уже исправлялось

История последних исправлений:

- устранена цепочка, приводившая к Progress 1101;
- Progress переведён на прямой route;
- убран тяжёлый legacy MutationObserver/catalog injection из production response path;
- убрана причина повторной отрисовки/дублирования меню;
- включён оптимизированный root entrypoint;
- Focus Ribbon исправлена семантика цели/отвлекающего стимула;
- Switcher исправлены display rule и scoring;
- Memory Grid выделена в отдельный модуль;
- session duration для Focus Ribbon и Switcher исправлен с «последнего раунда» на полную сессию;
- серверное сохранение оставлено через существующий authenticated `/api/game-sessions` contract.

Последние фактические commits:
- `69daa5efc5c9a09a5597599e290bf69c87b9be1f` — упрощение Worker entrypoint / удаление Progress 1101 path;
- `61112694e020fda709467feb2b064b006eb4ede0` — полный duration Focus Ribbon;
- `d26b24fd767b79e799e47e826db07709b504772b` — полный duration Switcher;
- `2c1b49b0f49117eaf30656cae439977f3c97aa5e` — Memory Grid v2;
- `915c522b871a141ddb9b3807391089e079d7b3c8` — activation Memory Grid v2;
- `65692a72a71272a603c34b7fda1576b9174d8cbf` — актуализация release documentation.

---

## 6. Известные проблемные зоны — НЕ считать решёнными без проверки

### P0 — Production/deployment

Главный неизвестный фактор: реально ли Cloudflare уже развернул текущий `main`.
GitHub connector показывает отсутствие CI status; Cloudflare logs недоступны.

Нельзя делать вывод «код работает в production» только по GitHub commit.

### P0 — Progress 1101

Кодовый путь UI был переписан, но реальный Telegram smoke test ещё не выполнен.
Нужно проверить именно production:
1. открыть Progress;
2. убедиться, что нет 1101;
3. проверить загрузку данных;
4. после игры убедиться, что статистика появляется.

### P0 — скорость

Пользователь сообщал о сильной медлительности загрузки и интерфейса.
Устранены известные источники лишней DOM-работы и дублирования, но производительность production ещё не профилирована на реальном устройстве.

Если после подтверждения deploy лаг остаётся:
- измерить network waterfall;
- проверить время Worker response;
- проверить число запросов к `/api/games` и Supabase;
- проверить повторные DOM injections;
- проверить Telegram WebView;
- проверить, не запускается ли одновременно legacy и v2 game logic;
- не добавлять новые Observer/interval без необходимости.

### P1 — Lightning

Lightning остаётся legacy UI.
Мы не должны считать её механику исправленной только потому, что root observer сохраняет её результат.
Нужно отдельно проверить:
- trigger;
- правильность target/non-target;
- timing;
- score;
- result persistence;
- UI feedback.

При исправлении сначала backup exact current `worker.js`.

### P1 — Memory Grid

Новая реализация использует strict-order механику.
Нужно проверить, что она соответствует утверждённому GDD, а не просто технически работает.
Также проверить duration_ms и статистику, если эта метрика будет обязательной.

### P1 — game feedback

Focus/Switcher показывают инструкцию «нажми/жди», но полноценная краткая визуальная обратная связь «верно/почти/ошибка» ещё не является отдельной принятой UX-системой.
Тексты должны соответствовать Product Positioning: ошибки мягкие («почти», «в следующий раз», «хорошая попытка»), без жёсткого «неправильно».

### P1 — Progress data model

Историческая ошибка: `player_game_analytics` vs `player_game_stats`.
Любые новые статистические функции сначала сверять с тем, куда реально пишет `record_game_session`.

### P2 — CI

GitHub сейчас не даёт полезного CI status для текущего commit.
Хорошее следующее улучшение: добавить минимальный CI, который хотя бы запускает syntax/build checks для всех Worker modules.

---

## 7. Правильный порядок дальнейшей работы

### Этап A — Production smoke test

Сначала ничего нового не добавлять.
Проверить текущий deployed build:
1. Telegram → Mini App.
2. Закрыть/открыть заново.
3. Открыть ещё раз.
4. Убедиться: один каталог, одна кнопка каждой игры, один Progress.
5. Открыть Progress.
6. Запустить каждую из 4 активных игр.
7. Проверить scoring.
8. Проверить возврат в меню.
9. Открыть Progress.
10. Проверить, что session появилась.
11. Повторить на iOS и Android.

### Этап B — Performance profiling

Если всё ещё медленно:
- сначала установить источник задержки;
- только потом менять код.

Приоритет оптимизации:
1. network/request count;
2. server response latency;
3. DOM replacement frequency;
4. observers/timers;
5. Telegram WebView overhead;
6. Supabase latency.

### Этап C — Mechanics audit

Проверить все четыре активные игры против GDD:
- stimulus generation;
- target/non-target distribution;
- difficulty progression;
- scoring formula;
- false positives;
- misses;
- correct rejections;
- latency;
- session duration;
- saved DB data;
- player-visible feedback.

### Этап D — Progress audit

Проверить полный путь:
`Telegram initData → /api/game-sessions → record_game_session → player_game_stats/game_sessions → /api/progress → progress_page.js`.

Никаких UI-костылей, если проблема находится в persistence/API.

### Этап E — только после стабильности

После прохождения MVP gate:
- Patterн;
- Dual Stream;
- персонализация;
- streaks;
- больше achievements;
- character customization;
- parent dashboard.

Не переходить к рейтингам, сезонам, Battle Pass и сложной монетизации до стабилизации ядра.

---

## 8. Backup policy

Перед структурным изменением Worker:
- сохранить exact current version;
- создать dated backup/tag/branch или отдельный backup file;
- не удалять legacy code без причины;
- фиксировать изменение в `docs/DEVELOPMENT_LOG.md`.

`worker.js` нельзя переписывать целиком ради удобства.

---

## 9. Документация в репозитории

Основные документы:
- `docs/BACKUP_POLICY.md` — правила резервирования и изменений;
- `docs/ARCHITECTURE_STATUS.md` — архитектурный baseline;
- `docs/DEVELOPMENT_LOG.md` — журнал разработки;
- `docs/RELEASE_STATUS_2026-09-04.md` — статус текущей стабилизации;
- `docs/PROGRESS_SCREEN_PLAN.md` — план Progress;
- `docs/NEXT.md` — следующие шаги;
- `docs/BASELINE_2026-09-03.md` — baseline;
- `docs/SWITCHER_IMPLEMENTATION.md` — Switcher;
- этот файл `docs/CHAT_HANDOFF_2026-09-04.md` — handoff для нового чата.

Product source documents находятся среди исходных проектных материалов:
- `01_Vision_Product_Concept.docx`;
- `02_Product_Positioning_Messaging.docx`;
- `04_PRD.docx`;
- `05_GDD.docx`.

---

## 10. Что новый чат должен считать источником правды

При конфликте приоритет такой:

1. Фактический код `main` и фактическая схема Supabase.
2. `04_PRD.docx` — границы MVP и Must/Should/Could/Won't.
3. `05_GDD.docx` — игровые механики.
4. `01_Vision_Product_Concept.docx` — продуктовая стратегия.
5. `02_Product_Positioning_Messaging.docx` — тексты/тон/запреты.
6. `docs/ARCHITECTURE_STATUS.md` и другие operational docs — текущая техническая фиксация.

Если документация расходится с кодом — не скрывать расхождение. Проверить код, затем обновить документацию после принятого решения.

---

## 11. Инструкция новому чату: первый ответ/первые действия

Не спрашивать владельца заново, что за проект.

Стартовый алгоритм:

1. Прочитать `docs/CHAT_HANDOFF_2026-09-04.md`.
2. Проверить текущий HEAD `main`.
3. Fetch/read `wrangler.toml`, `root_entry.js`, `worker_entry.js`, `progression_entry.js`, `progress_page.js`, активные game modules.
4. Проверить фактические Supabase таблицы/RPC.
5. Сверить документацию.
6. Определить, что реально deployed, а что только committed.
7. Не добавлять новые функции до закрытия P0.
8. Если владелец сообщает о баге — искать root cause и исправлять самостоятельно.
9. После каждого рискованного structural change — backup + docs.
10. В конце давать короткий фактический статус: что изменено, commit SHA, что проверено, что осталось непроверенным.

---

## 12. Готовая мини-инструкция для вставки в новый чат

Скопировать новый чат:

> Ты продолжаешь разработку проекта NeuroGeroy. Не начинай проект с нуля и не проси меня повторять контекст. Сначала прочитай `docs/CHAT_HANDOFF_2026-09-04.md` в репозитории `knyavik-stack/neurogeroy`, затем проверь текущий `main`, `wrangler.toml`, `root_entry.js`, Supabase schema/RPC и связанные docs. Работай самостоятельно через подключённые инструменты. Мне нужен результат, а не обсуждение. Не добавляй новые функции, пока не закрыты P0/P1 из handoff. При изменении legacy Worker сначала делай backup. Для любой проблемы сначала найди root cause, исправь код, обнови документацию и зафиксируй commit. Не утверждай production-ready без реального smoke test; чётко разделяй code-complete и production-verified. Текущие главные риски: медленная загрузка, исторический Progress 1101, корректность механик/оценок 4 игр, фактический Cloudflare deployment и persistence прогресса. После начала сразу переходи к проверке и действиям, не води меня по кругу.

---

## 13. Текущий статус на момент передачи

**Code stabilization: READY.**

**Production verification: NOT YET PROVEN.**

Причина: текущий инструмент не предоставляет Cloudflare deployment/build logs, а реальный Telegram smoke test ещё не выполнен.

Следующая цель — не «ещё одна функция», а доказанная стабильность:
- быстрый старт;
- отсутствие дублей;
- отсутствие 1101;
- корректная механика;
- корректный scoring;
- сохранение сессий;
- непустой Progress;
- повторное открытие без деградации;
- iOS + Android.

Только после этого переходить к следующей продуктовой фазе.
