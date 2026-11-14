const { timingSafeEqual } = require("node:crypto");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const WEBHOOK_URL = "https://tata-nails-bot.vercel.app/api/telegram";
const MINI_APP_URL =
  process.env.MINI_APP_URL || "https://tata-course-miniapp.vercel.app/";

function isAuthorized(header) {
  if (!WEBHOOK_SECRET || typeof header !== "string") return false;

  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const received = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(WEBHOOK_SECRET);

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

async function telegram(method, payload) {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || `${method} failed (HTTP ${response.status})`);
  }

  return result.result;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!BOT_TOKEN || !WEBHOOK_SECRET) {
    return res.status(503).json({
      ok: false,
      error: "Add BOT_TOKEN and WEBHOOK_SECRET in Vercel Production environment variables first.",
    });
  }

  if (!isAuthorized(req.headers.authorization)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const results = {};

  try {
    await telegram("setWebhook", {
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ["message"],
    });
    results.webhook = "configured";

    await telegram("setChatMenuButton", {
      menu_button: {
        type: "web_app",
        text: "Курсы маникюра",
        web_app: { url: MINI_APP_URL },
      },
    });
    results.menuButton = "configured";

    await telegram("setMyCommands", {
      commands: [
        { command: "start", description: "Открыть курс по маникюру" },
      ],
    });
    results.commands = "configured";

    await telegram("setMyDescription", {
      description:
        "Онлайн-курс Tata Nails по маникюру. Посмотрите программу обучения и откройте приложение, чтобы выбрать удобный способ оплаты.",
      language_code: "ru",
    });
    results.description = "configured";

    await telegram("setMyShortDescription", {
      short_description: "Онлайн-курс Tata Nails по маникюру.",
      language_code: "ru",
    });
    results.shortDescription = "configured";

    return res.status(200).json({
      ok: true,
      message: "Tata Nails Bot has been configured.",
      results,
      webhookUrl: WEBHOOK_URL,
      miniAppUrl: MINI_APP_URL,
    });
  } catch (error) {
    console.error("Telegram setup failed:", error.message);
    return res.status(502).json({
      ok: false,
      error: "Telegram setup did not finish. Check the Telegram token and bot settings, then run setup again.",
      completed: results,
    });
  }
};
