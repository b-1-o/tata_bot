# Tata Nails Bot

Telegram-бот для курса Tata Nails. Команда `/start` отправляет приветственную карточку с фотографией, описанием курса и inline-кнопкой **«Открыть курс»**. Постоянная кнопка меню **«Курсы маникюра»** открывает то же Mini App.

Бот работает на **Vercel Functions**. Собственный сервер, VPS, Cloudflare, база данных и постоянно включённый компьютер не нужны.

## Что уже подготовлено

- Код webhook: `api/telegram.js`.
- Файл приветственной карточки должен лежать как `bot/welcome-card.jpg` (корень проекта Vercel — папка `bot/`).
- Автоматическая настройка Telegram: `api/setup.js`.
- Скрипт альтернативной регистрации webhook: `scripts/set-webhook.cjs`.
- Отдельный проект Vercel: `tata-nails-bot`.
- Root Directory проекта: `bot`.
- Адрес webhook: https://tata-nails-bot.vercel.app/api/telegram
- Адрес изображения после добавления файла: https://tata-nails-bot.vercel.app/welcome-card.jpg
- Ссылка Mini App уже добавлена в Vercel как `MINI_APP_URL`: https://tata-course-miniapp.vercel.app/

Mini App продолжает работать отдельно в проекте `tata-course-miniapp`.

## Шаг 1. Создай бота через BotFather

1. Открой Telegram и найди `@BotFather`.
2. Отправь `/newbot`.
3. Введи отображаемое имя: **Tata Nails Bot**.
4. Выбери свободный username, который заканчивается на `bot` (например, вариант с TataNails).
5. BotFather выдаст **HTTP API Token**. Скопируй и сохрани его приватно. Не отправляй токен в этот чат и не добавляй его в GitHub.

> Если бот уже создан, повторно создавать его не нужно — используй токен именно нового бота TataNailsBot.

## Шаг 2. Добавь два секрета в Vercel

Открой [Vercel → tata-nails-bot → Settings → Environment Variables](https://vercel.com/erikghabuzyan6-maxs-projects/tata-nails-bot/settings/environment-variables).

Добавь обе переменные для окружения **Production**:

| Name | Value |
|---|---|
| `BOT_TOKEN` | HTTP API Token нового бота от BotFather |
| `WEBHOOK_SECRET` | Случайный секрет из следующего шага |

`MINI_APP_URL` уже создан в проекте — добавлять его повторно не надо.

Сгенерируй секрет на своём компьютере:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Скопируй результат в `WEBHOOK_SECRET` в Vercel. Это отдельный пароль для защиты webhook, он не заменяет токен BotFather.

Сохрани переменные и выполни **Redeploy** последнего Production deployment, чтобы Vercel Function получила новые значения.

## Шаг 3. Выполни автоматическую настройку бота

После Redeploy открой терминал и выполни команду:

```bash
read -rsp "Вставь значение WEBHOOK_SECRET из Vercel: " WEBHOOK_SECRET
echo
curl -sS -X POST \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  https://tata-nails-bot.vercel.app/api/setup
unset WEBHOOK_SECRET
```

Секрет вводится скрыто и не попадает в историю команды. Токен BotFather в терминал вводить не нужно: он уже хранится в Vercel.

При успешном ответе увидишь `"ok": true` и настроенные пункты:

- `webhook` — Telegram отправляет команды на Vercel;
- `menuButton` — постоянная кнопка «Курсы маникюра»;
- `commands` — команда `/start`;
- `name` — имя Tata Nails Bot;
- `description` и `shortDescription` — описание на русском.

Повторный вызов безопасен: настройки можно применять повторно, например после смены токена.

## Шаг 4. Проверь бота в Telegram

1. Открой нового бота TataNailsBot по его username.
2. Нажми **Start**.
3. Бот отправит файл `welcome-card.jpg` с исходным текстом приветствия и кнопкой:

   **TATA NAILS**

   *Искусство маникюра — в деталях.*

   Онлайн-курс для тех, кто хочет разобраться в технике, выстроить последовательность работы и уделять внимание каждой детали.

   Подготовка и инструменты, техника маникюра, форма и покрытие — всё последовательно и в одном месте.

   Откройте страницу курса, чтобы изучить программу и выбрать удобный способ оплаты.

4. Под карточкой будет одна кнопка **«Открыть курс»**.
5. Нажми кнопку — откроется https://tata-course-miniapp.vercel.app/
6. Закрой Mini App. Внизу чата должна остаться кнопка **«Курсы маникюра»**.
7. Отправь `/start` ещё раз и проверь, что карточка приходит снова.

## Если не работает

- **Бот молчит:** проверь, что `BOT_TOKEN` относится именно к новому боту, а `WEBHOOK_SECRET` добавлен в Production, после этого сделай Redeploy.
- **Setup возвращает 401:** секрет в заголовке должен точно совпадать со значением `WEBHOOK_SECRET` в Vercel.
- **Setup возвращает 502:** проверь токен BotFather и открой Vercel → Deployments → Functions/Logs.
- **Не загружается фотография:** добавь полученный JPEG в репозиторий под путём `bot/welcome-card.jpg`, затем отправь commit в `main`, чтобы Vercel включил файл в Production deployment. Если Telegram не может загрузить изображение, бот отправит текст с кнопкой как запасной вариант.
- **Открывается не тот Mini App:** проверь значение `MINI_APP_URL` в Production.
- **После замены токена:** обнови `BOT_TOKEN` в Vercel, сделай Redeploy и повтори setup-запрос.

GET-проверка endpoint:

https://tata-nails-bot.vercel.app/api/telegram

До добавления токена и секрета там будет `configured: false`; после настройки и Redeploy должно быть `configured: true`.

## Передача заказчице

Перед запуском продаж и передачей проекта:

- передай заказчице владение ботом через BotFather;
- передай/перенеси Vercel-проект в её аккаунт;
- передай репозиторий GitHub или предоставь необходимые права;
- убедись, что Tribute, закрытый канал и реквизиты выплат находятся под её контролем;
- не отправляй токен обычным сообщением; если он был раскрыт, перевыпусти его через BotFather и обнови в Vercel.

## Роль бота и Tribute

Бот только приветствует пользователя и открывает Mini App. Он не обрабатывает оплату и не выдаёт доступ к каналу. Для автоматической продажи курса настрой в Tribute две подписки с разовой оплатой — отдельно RUB и USD — привязанные к закрытому каналу. В Mini App уже предусмотрен отдельный переход на каждую ссылку оплаты.
