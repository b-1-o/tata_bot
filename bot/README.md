# Tata Nails Bot

A small Telegram bot for the Tata Nails course. It sends a welcome message on `/start`, shows one button that opens the existing Mini App, and configures the persistent chat menu button for that user.

The bot runs as a Vercel Function. No VPS, always-on computer, Cloudflare Worker, database, or third-party bot platform is required.

## Architecture

- Telegram sends bot updates to the HTTPS webhook at `/api/telegram`.
- The Vercel Function verifies Telegram's webhook secret.
- On `/start`, it sends a welcome message with one Mini App button.
- It also sets the chat's menu button to "Курсы маникюра".
- Course presentation and checkout stay in the existing Mini App and Tribute subscriptions.

## 1. Create the bot in Telegram

1. Open `@BotFather` and send `/newbot`.
2. Enter the display name `Tata Nails Bot`.
3. Choose an available username ending in `bot`.
4. Copy the HTTP API token. Treat it like a password; do not paste it into GitHub or public chats.
5. Optional: use `/setdescription` to set a short bot description, and `/setabouttext` for the profile text.

Suggested description:

> Онлайн-курс Tata Nails по маникюру. Программа обучения и оформление доступа в одном месте.

## 2. Deploy the bot to Vercel

Create a separate Vercel project linked to the same GitHub repository:

- Repository: `b-1-o/tata_bot`
- Project name: `tata-nails-bot`
- Root Directory: `bot`
- Framework preset: Other (or let Vercel detect it)
- Production branch: `main`

The API endpoint will be:

`https://tata-nails-bot.vercel.app/api/telegram`

If Vercel assigns a different production domain, use that exact domain in `WEBHOOK_URL`.

## 3. Add environment variables in Vercel

In the Vercel project `tata-nails-bot`, open **Settings → Environment Variables** and add these for the **Production** environment:

| Name | Value |
|---|---|
| `BOT_TOKEN` | Token copied from BotFather |
| `WEBHOOK_SECRET` | A random secret containing 1–256 letters, numbers, underscores or hyphens |
| `MINI_APP_URL` | `https://tata-course-miniapp.vercel.app/` |

Save the variables and redeploy the latest Production deployment so the function receives them.

Generate a webhook secret on your computer with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use the same generated value in Vercel and in your local `.env.local` file.

## 4. Register the Telegram webhook once

On your computer, copy `.env.example` to `.env.local` inside the `bot/` directory. Put the real `BOT_TOKEN` and the exact same `WEBHOOK_SECRET` used in Vercel into `.env.local`.

Then run:

```bash
node scripts/set-webhook.cjs
```

The script calls Telegram's `setWebhook` method. It does not print or commit the bot token. You only need to run it once, and again only if the webhook URL or secret changes.

Check the endpoint in a browser:

`https://tata-nails-bot.vercel.app/api/telegram`

It should return a small JSON health response. It will report whether the environment variables are present, but never returns their values.

## 5. Test the bot

1. Open the bot in Telegram and press **Start**.
2. It should send a welcome message in Russian.
3. The message should contain one button: **Открыть курс**.
4. Press it; the existing Tata Nails Mini App should open.
5. Close the Mini App. The chat's bottom menu button should show **Курсы маникюра** and open the same Mini App.
6. Test `/start` again to confirm the greeting works.

## 6. Hand over to the course owner

Before handover:

- Make sure the bot itself is owned by the client (or transfer ownership using BotFather).
- Add the client's own Vercel account/team as project owner or transfer the Vercel project to the client's account.
- Transfer control of the GitHub repository or add the client with the right access level.
- The client should control the BotFather account, Tribute account, private course channel, and payout details.
- Rotate the bot token in BotFather if it was ever exposed, then update `BOT_TOKEN` in Vercel and redeploy.
- Never put `BOT_TOKEN` or `WEBHOOK_SECRET` in source code, screenshots, or the public repository.

## Notes

- The bot does not process payments and does not grant course access itself. Tribute remains responsible for payment and channel access according to the configured subscription.
- No database is needed for the greeting-and-launch flow.
- If the project is moved to another Vercel account or its domain changes, update `WEBHOOK_URL` and register the webhook again.
